import { Prisma } from "@prisma/client";
import { prisma } from "../../infra/prisma";
import { AppStatusEnum, AppointmentDTO } from "./dto";
import { forbidden, unauthenticated } from "../../utils/appError";
import z from "zod";
import { ReminderService } from "./reminder/serviceReminder";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { mailer } from "../../mailer/mailer";

type Role = "ADMIN" | "DOCTOR" | "SECRETARY";

export type CurrentUser = {
  id: string;
  role: Role;
};

const isAdmin: (r: Role) => boolean = (role) => role === "ADMIN";
const isDoctor: (r: Role) => boolean = (role) => role === "DOCTOR";
const isSecretary: (r: Role) => boolean = (role) => role === "SECRETARY";

// Guards basique
function ensureLogged(u?: CurrentUser): asserts u is CurrentUser {
  if (!u?.id) {
    const e: any = unauthenticated("UNAUTHENTICATED");
    e.message = "User must be logged in to perform this action";
    throw e;
  }
}

function canWriteAndReadAppointment(user: CurrentUser, apptDoctorId: string) {
  if (isAdmin(user.role) || isSecretary(user.role)) return true;
  if (isDoctor(user.role) && user.id === apptDoctorId) return true;
  return false;
}

// Healpers

function toDTO(a: any): AppointmentDTO {
  return {
    id: a.id,
    patientId: a.patientId,
    doctorId: a.doctorId,
    startsAt: a.startsAt.toISOString(),
    endsAt: a.endsAt.toISOString(),
    reason: a.reason,
    status: a.status,
    location: a.location,
    notes: a.notes,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
    patient: a.patient
      ? {
          id: a.patient.id,
          firstName: a.patient.firstName,
          lastName: a.patient.lastName,
        }
      : undefined,
    doctor: a.doctor
      ? {
          id: a.doctor.id,
          firstName: a.doctor.firstName,
          lastName: a.doctor.lastName,
        }
      : undefined,
  };
}

function overlaps(s1: Date, e1: Date, s2: Date, e2: Date) {
  return s1 < e2 && s2 < e1;
}

async function assertNoConflicts(
  doctorId: string,
  patientId: string,
  startsAt: Date,
  endsAt: Date,
  excludeId?: string
) {
  // Cherche RDV qui se chevauchent pour le même doctor OU le même patient
  const whereBase: Prisma.AppointmentWhereInput = {
    id: excludeId ? { not: excludeId } : undefined,
    OR: [{ doctorId }, { patientId }],
  };
  // On filtre au plus large : RDV qui touchent la fenêtre [startsAt, endsAt)
  const candidates = await prisma.appointment.findMany({
    where: {
      ...whereBase,
      startsAt: { lt: endsAt },
      endsAt: { gt: startsAt },
      status: { not: "CANCELLED" },
    },
    select: {
      id: true,
      startsAt: true,
      endsAt: true,
      doctorId: true,
      patientId: true,
      status: true,
    },
  });

  if (candidates.length) {
    const clash = candidates.find((c) =>
      overlaps(c.startsAt, c.endsAt, startsAt, endsAt)
    );
    if (clash) {
      const e: any = new Error("TIME_CONFLICT");
      e.status = 409;
      e.details = {
        with: clash.id,
        doctorId: clash.doctorId,
        patientId: clash.patientId,
      };
      throw e;
    }
  }
}

// --------- Notification (stub) ----------
export const NotificationService = {
  async sendAppointmentReminder(appointmentId: string) {
    // charge RDV + patient + docteur
    const appt = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        patient: true,
        doctor: true,
      },
    });
    if (!appt) throw new Error("Appointment not found");

    if (!appt.patient?.email) {
      throw new Error("Patient email missing");
    }

    const startsAt = appt.startsAt;
    const dateStr = format(startsAt, "EEEE d MMMM yyyy 'à' HH:mm", { locale: fr });
    const doctorName = appt.doctor ? `${appt.doctor.firstName} ${appt.doctor.lastName}` : "votre praticien";
    const manageUrl = `${process.env.FRONTEND_URL ?? "http://localhost:5173"}/appointments/${appt.id}`;

    const subject = `Rappel de rendez-vous — ${dateStr}`;
    const html = `
      <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;line-height:1.5;">
        <h2 style="margin:0 0 12px">Rappel de votre consultation</h2>
        <p>Bonjour ${appt.patient.firstName ?? ""} ${appt.patient.lastName ?? ""},</p>
        <p>Nous vous rappelons votre rendez-vous ${dateStr} avec ${doctorName}.</p>
        ${appt.location ? `<p>Lieu : <strong>${appt.location}</strong></p>` : ""}
        ${appt.notes ? `<p style="white-space:pre-wrap;">Notes : ${appt.notes}</p>` : ""}
        <p style="margin-top:16px">
          <a href="${manageUrl}" style="display:inline-block;padding:10px 14px;border-radius:8px;border:1px solid #ddd;text-decoration:none">
            Voir / gérer le rendez-vous
          </a>
        </p>
        <p style="color:#666;margin-top:16px">Si vous ne pouvez pas venir, merci de nous prévenir dès que possible.</p>
      </div>
    `;

    await mailer.sendMail({
      from: process.env.MAIL_FROM!,
      to: appt.patient.email,
      subject,
      html,
    });
  },
};

// --------- Service principal ----------
export const AppointmentsService = {
  async list(
    user: CurrentUser,
    q: {
      from?: string;
      to?: string;
      doctorId?: string;
      patientId?: string;
      page: number;
      pageSize: number;
    }
  ) {
    ensureLogged(user);
    const where: Prisma.AppointmentWhereInput = {};

    if (q.doctorId) where.doctorId = q.doctorId;
    if (q.patientId) where.patientId = q.patientId;

    if (q.from && q.to) {
      where.AND = [
        { startsAt: { lt: new Date(q.to) } },
        { endsAt: { gt: new Date(q.from) } },
      ];
    } else if (q.from) {
      where.endsAt = { gt: new Date(q.from) };
    } else if (q.to) {
      where.startsAt = { lt: new Date(q.to) };
    }

    // DOCTOR ne voit que ses RDV
    if (isDoctor(user.role)) {
      where.doctorId = user.id;
    }

    const skip = (q.page - 1) * q.pageSize;
    const [rows, total] = await Promise.all([
      prisma.appointment.findMany({
        where,
        include: {
          patient: { select: { id: true, firstName: true, lastName: true } },
          doctor: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: [{ startsAt: "asc" }, { id: "asc" }],
        skip,
        take: q.pageSize,
      }),
      prisma.appointment.count({ where }),
    ]);

    return {
      items: rows.map(toDTO),
      page: q.page,
      pageSize: q.pageSize,
      total,
    };
  },

  async create(
    user: CurrentUser,
    body: {
      patientId: string;
      doctorId: string;
      startsAt: string;
      endsAt: string;
      reason?: string;
      status?: z.infer<typeof AppStatusEnum>;
      location?: string;
      notes?: string;
    }
  ) {
    ensureLogged(user);
    if (!canWriteAndReadAppointment(user, body.doctorId)) {
      const e: any = forbidden("FORBIDDEN");
      e.status = 403;
      throw e;
    }

    const startsAt = new Date(body.startsAt);
    const endsAt = new Date(body.endsAt);
    if (!(startsAt < endsAt)) {
      const e: any = new Error("INVALID_TIME_RANGE");
      e.status = 400;
      throw e;
    }

    // Vérifie existence patient + doctor
    const [patientExists, doctorExists] = await Promise.all([
      prisma.patient.findUnique({
        where: { id: body.patientId },
        select: { id: true },
      }),
      prisma.user.findUnique({
        where: { id: body.doctorId },
        select: { id: true, role: true },
      }),
    ]);
    if (!patientExists) {
      const e: any = new Error("PATIENT_NOT_FOUND");
      e.status = 404;
      throw e;
    }
    if (!doctorExists || doctorExists.role !== "DOCTOR") {
      const e: any = new Error("DOCTOR_NOT_FOUND");
      e.status = 404;
      throw e;
    }

    await assertNoConflicts(body.doctorId, body.patientId, startsAt, endsAt);

    const created = await prisma.appointment.create({
      data: {
        patientId: body.patientId,
        doctorId: body.doctorId,
        startsAt,
        endsAt,
        reason: body.reason,
        status: (body.status ?? "SCHEDULED") as any,
        location: body.location,
        notes: body.notes,
      },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true } },
        doctor: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    await ReminderService.upsertForAppointment(created.id, startsAt);

    return toDTO(created);
  },

  async getById(user: CurrentUser, id: string) {
    ensureLogged(user);
    const a = await prisma.appointment.findUnique({
      where: { id },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true } },
        doctor: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    if (!a) {
      const e: any = new Error("APPOINTMENT_NOT_FOUND");
      e.status = 404;
      throw e;
    }
    if (!canWriteAndReadAppointment(user, a.doctorId)) {
      const e: any = forbidden("FORBIDDEN");
      e.status = 403;
      throw e;
    }
    return toDTO(a);
  },

async update(
  user: CurrentUser,
  id: string,
  patch: {
    startsAt?: string;
    endsAt?: string;
    reason?: string;
    status?: z.infer<typeof AppStatusEnum>;
    location?: string;
    notes?: string;
  }
) {
  ensureLogged(user);

  const prev = await prisma.appointment.findUnique({ where: { id } });
  if (!prev) {
    const e: any = new Error("APPOINTMENT_NOT_FOUND");
    e.status = 404;
    throw e;
  }
  if (!canWriteAndReadAppointment(user, prev.doctorId)) {
    const e: any = forbidden("FORBIDDEN");
    e.status = 403;
    throw e;
  }

  type AppStatus = z.infer<typeof AppStatusEnum>;
  function canTransition(from: AppStatus, to: AppStatus) {
    const map: Record<AppStatus, AppStatus[]> = {
      SCHEDULED: ["CONFIRMED","CANCELLED","NO_SHOW","DONE"],
      CONFIRMED: ["CANCELLED","NO_SHOW","DONE"],
      CANCELLED: [],
      NO_SHOW:   [],
      DONE:      [],
    };
    return map[from].includes(to);
  }
  if (patch.status && patch.status !== (prev.status as AppStatus)) {
    if (!canTransition(prev.status as AppStatus, patch.status as AppStatus)) {
      const e: any = new Error("INVALID_STATE_TRANSITION");
      e.status = 422;
      e.details = { from: prev.status, to: patch.status };
      throw e;
    }
  }

  const nextStarts = patch.startsAt ? new Date(patch.startsAt) : prev.startsAt;
  const nextEnds   = patch.endsAt   ? new Date(patch.endsAt)   : prev.endsAt;

  if (!(nextStarts < nextEnds)) {
    const e: any = new Error("INVALID_TIME_RANGE");
    e.status = 400;
    throw e;
  }

  if (patch.startsAt || patch.endsAt) {
    await assertNoConflicts(prev.doctorId, prev.patientId, nextStarts, nextEnds, prev.id);
  }

  const updated = await prisma.appointment.update({
    where: { id },
    data: {
      startsAt: patch.startsAt ? nextStarts : undefined,
      endsAt:   patch.endsAt   ? nextEnds   : undefined,
      reason:   patch.reason,
      status:   patch.status as any,
      location: patch.location,
      notes:    patch.notes,
    },
    include: {
      patient: { select: { id: true, firstName: true, lastName: true } },
      doctor:  { select: { id: true, firstName: true, lastName: true } },
    },
  });

  if (["CANCELLED", "DONE", "NO_SHOW"].includes(updated.status as any)) {
    await ReminderService.cancelForAppointment(updated.id);
  } else if (patch.startsAt || patch.endsAt) {
    await ReminderService.upsertForAppointment(updated.id, updated.startsAt);
  }

  return toDTO(updated); 
},

  async cancel(user: CurrentUser, id: string) {
    ensureLogged(user);
    const prev = await prisma.appointment.findUnique({ where: { id } });
    if (!prev) {
      const e: any = new Error("APPOINTMENT_NOT_FOUND");
      e.status = 404;
      throw e;
    }
    if (!canWriteAndReadAppointment(user, prev.doctorId)) {
      const e: any = forbidden("FORBIDDEN");
      e.status = 403;
      throw e;
    }

    await prisma.appointment.update({
      where: { id },
      data: { status: "CANCELLED" as any },
    });
    await ReminderService.cancelForAppointment(id);
    return { id, status: "CANCELLED" as const };
  },

  async forceReminder(user: CurrentUser, id: string) {
    ensureLogged(user);
    const prev = await prisma.appointment.findUnique({ where: { id } });
    if (!prev) {
      const e: any = new Error("APPOINTMENT_NOT_FOUND");
      e.status = 404;
      throw e;
    }
    if (!canWriteAndReadAppointment(user, prev.doctorId)) {
      const e: any = forbidden("FORBIDDEN");
      e.status = 403;
      throw e;
    }

    if (
      prev.status === "CANCELLED" ||
      prev.status === "DONE" ||
      prev.status === "NO_SHOW"
    ) {
      const e: any = new Error("REMINDER_NOT_ALLOWED");
      e.status = 400;
      throw e;
    }
    await NotificationService.sendAppointmentReminder(id);
    return { ok: true };
  },
};
