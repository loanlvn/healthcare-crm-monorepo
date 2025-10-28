// modules/patients/service.ts
import { prisma } from '../../infra/prisma';
import { AppError, forbidden, notFound } from '../../utils/appError';
import type { Role, Patient } from '@prisma/client';
import type { CreatePatientDTO, ListPatientsQuery, UpdatePatientDTO } from './dto';

type Auth = { id: string; role: Role };

const canWrite = (role: Role) => role === 'ADMIN' || role === 'DOCTOR' || role === 'SECRETARY';
const isAdmin = (role: Role) => role === 'ADMIN';
const isSecretary = (role: Role) => role === 'SECRETARY';
const isDoctor = (role: Role) => role === 'DOCTOR';

const patientSelect = {
  id: true,
  firstName: true,
  lastName: true,
  birthDate: true,
  phone: true,
  email: true,
  address: true,
  assuranceNumber: true,
  doctorName: true,
  notes: true,
  ownerId: true,
  owner: { select: { id: true, firstName: true, lastName: true, email: true } },
  createdAt: true,
  updatedAt: true,
} as const;

export async function listPatients(auth: Auth, q: ListPatientsQuery) {
  // Base WHERE avec recherche
  const where: any = {
    ...(q.q
      ? {
          OR: [
            { firstName: { contains: q.q, mode: 'insensitive' } },
            { lastName: { contains: q.q, mode: 'insensitive' } },
            { email: { contains: q.q, mode: 'insensitive' } },
            { phone: { contains: q.q, mode: 'insensitive' } },
            { assuranceNumber: { contains: q.q, mode: 'insensitive' } },
            { doctorName: { contains: q.q, mode: 'insensitive' } },
            { notes: { contains: q.q, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  // Visibilité:
  if (isDoctor(auth.role)) {
    // un médecin ne voit QUE ses patients
    where.ownerId = auth.id;
  } else if (isAdmin(auth.role) || isSecretary(auth.role)) {
    // admin/secretary peuvent filtrer par ownerId si fourni
    if (q.ownerId) where.ownerId = q.ownerId;
  }

  const page = q.page ?? 1;
  const pageSize = q.pageSize ?? 10;
  const skip = (page - 1) * pageSize;

  const [items, total] = await Promise.all([
    prisma.patient.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: [{ [q.orderBy || 'createdAt']: q.order || 'desc' }, { id: 'asc' }],
      select: patientSelect,
    }),
    prisma.patient.count({ where }),
  ]);

  return {
    items,
    meta: {
      mode: 'offset' as const,
      total,
      page,
      pageSize,
      hasNextPage: page * pageSize < total,
      hasPreviousPage: page > 1,
      orderBy: q.orderBy,
      order: q.order,
    },
  };
}

export async function getPatient(auth: Auth, id: string) {
  const p = await prisma.patient.findUnique({
    where: { id },
    select: patientSelect,
  });
  if (!p) throw notFound('NOT_FOUND', 'Patient not found');
  if (isDoctor(auth.role) && p.ownerId !== auth.id) {
    throw forbidden('FORBIDDEN', 'Not allowed');
  }
  return p;
}

export async function createPatient(auth: Auth, dto: CreatePatientDTO) {
  if (!canWrite(auth.role)) throw forbidden('FORBIDDEN');

  const ownerId =
    isDoctor(auth.role)
      ? auth.id // ignore dto.ownerId si médecin
      : (dto.ownerId || null);

  if (!ownerId) {
    throw new AppError(400, 'VALIDATION_ERROR', 'ownerId is required');
  }

  const data: any = {
    firstName: dto.firstName,
    lastName: dto.lastName,
    ownerId,
    birthDate: dto.birthDate ?? null,
    phone: dto.phone ?? null,
    email: dto.email ?? null,
    address: dto.address ?? null,
    assuranceNumber: dto.assuranceNumber ?? null,
    doctorName: dto.doctorName ?? null,
    notes: dto.notes ?? null,
  };

  const p = await prisma.patient.create({ data, select: patientSelect });
  return p;
}

export async function updatePatient(auth: Auth, id: string, dto: UpdatePatientDTO) {
  const current = await prisma.patient.findUnique({ where: { id }, select: { id: true, ownerId: true } });
  if (!current) throw notFound('NOT_FOUND', 'Patient not found');

  const can =
    isAdmin(auth.role) ||
    isSecretary(auth.role) ||
    (isDoctor(auth.role) && current.ownerId === auth.id);

  if (!can) throw forbidden('FORBIDDEN');

  const next: any = {
    // champs éditables
    ...(dto.firstName !== undefined ? { firstName: dto.firstName } : {}),
    ...(dto.lastName !== undefined ? { lastName: dto.lastName } : {}),
    ...(dto.birthDate !== undefined ? { birthDate: dto.birthDate ?? null } : {}),
    ...(dto.phone !== undefined ? { phone: dto.phone ?? null } : {}),
    ...(dto.email !== undefined ? { email: dto.email ?? null } : {}),
    ...(dto.address !== undefined ? { address: dto.address ?? null } : {}),
    ...(dto.assuranceNumber !== undefined ? { assuranceNumber: dto.assuranceNumber ?? null } : {}),
    ...(dto.doctorName !== undefined ? { doctorName: dto.doctorName ?? null } : {}),
    ...(dto.notes !== undefined ? { notes: dto.notes ?? null } : {}),
  };

  // Changement d’owner UNIQUEMENT admin/secretary
  if ((isAdmin(auth.role) || isSecretary(auth.role)) && dto.ownerId) {
    next.ownerId = dto.ownerId;
  }

  const updated = await prisma.patient.update({
    where: { id },
    data: next,
    select: patientSelect,
  });
  return updated;
}

export async function deletePatient(auth: Auth, id: string) {
  const current = await prisma.patient.findUnique({ where: { id }, select: { id: true, ownerId: true } });
  if (!current) throw notFound('NOT_FOUND', 'Patient not found');

  const can = isAdmin(auth.role) || (isDoctor(auth.role) && current.ownerId === auth.id);
  if (!can) throw forbidden('FORBIDDEN');

  // simple delete (si tu veux un soft delete, ajoute un champ deletedAt dans Prisma)
  await prisma.patient.delete({ where: { id } });
}



/*
export async function softDeletePatient(auth: Auth, id: string) {
  await ensureDeletable(auth, id);
  await prisma.patient.update({
    where: { id },
    data: { isDeleted: true, deletedAt: new Date() },
  });
}

const isAdminOrSec = (r: Role) => r === 'ADMIN' || r === 'SECRETARY';

export async function assignDoctor(
  auth: Auth,
  patientId: string,
  input: { doctorId: string; specialty?: string; primary?: boolean }
) {
  const p = await prisma.patient.findUnique({ where: { id: patientId } });
  if (!p || p.isDeleted) throw notFound('NOT_FOUND', 'Patient not found');

  if (!(isAdminOrSec(auth.role) || p.ownerId === auth.id)) {
    throw forbidden('FORBIDDEN', 'Assign not allowed');
  }

  // Vérifier que le doctorId correspond bien à un DOCTOR
  const doc = await prisma.user.findUnique({
    where: { id: input.doctorId },
    select: { id: true, role: true, DoctorProfile: { select: { specialties: true } } },
  });
  if (!doc || doc.role !== 'DOCTOR') {
    throw new AppError(400, 'INVALID_DOCTOR', 'doctorId must be a DOCTOR');
  }

  // Si specialty fournie, s'assurer que le doc la possède
  if (input.specialty) {
    const has = doc.DoctorProfile?.specialties?.some(
      (s: any) => s.trim().toLowerCase() === input.specialty!.trim().toLowerCase()
    );
    if (!has) {
      throw new AppError(400, 'DOCTOR_LACKS_SPECIALTY', 'Doctor does not have the required specialty');
    }
  }

  if (input.primary) {
    await prisma.patientDoctor.updateMany({
      where: { patientId },
      data: { primary: false },
    });
  }

  await prisma.patientDoctor.upsert({
    where: { patientId_doctorId: { patientId, doctorId: input.doctorId } },
    update: { specialty: input.specialty ?? null, primary: !!input.primary },
    create: {
      patientId,
      doctorId: input.doctorId,
      specialty: input.specialty ?? null,
      primary: !!input.primary,
      assignedBy: auth.id,
    },
  });
}

export async function unassignDoctor(auth: Auth, patientId: string, doctorId: string) {
  const p = await prisma.patient.findUnique({ where: { id: patientId } });
  if (!p || p.isDeleted) throw notFound('NOT_FOUND', 'Patient not found');
  if (!(auth.role === 'ADMIN' || auth.role === 'SECRETARY' || p.ownerId === auth.id)) {
    throw forbidden('FORBIDDEN', 'Unassign not allowed');
  }
  if (doctorId === p.ownerId) {
    throw new AppError(400, 'CANNOT_REMOVE_OWNER', 'Use transfer owner endpoint');
  }
  await prisma.patientDoctor.deleteMany({ where: { patientId, doctorId } });
}

export async function transferOwner(auth: Auth, patientId: string, newOwnerId: string) {
  const p = await prisma.patient.findUnique({ where: { id: patientId } });
  if (!p || p.isDeleted) throw notFound('NOT_FOUND', 'Patient not found');

  if (!(auth.role === 'ADMIN' || auth.role === 'SECRETARY' || p.ownerId === auth.id)) {
    throw forbidden('FORBIDDEN', 'Transfer not allowed');
  }

  await prisma.patient.update({
    where: { id: patientId },
    data: { ownerId: newOwnerId },
  });
}
  */
