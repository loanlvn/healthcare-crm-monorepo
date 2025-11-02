/* eslint-disable @typescript-eslint/no-explicit-any */
import { api } from "@/lib/api";
import type { AppointmentDTO, ListParams, PageResponse } from "../types/AppointmentsTypes";


const stripMs = (iso?: string) => (iso ? iso.replace(/\.\d{3}Z$/, "Z") : undefined);
function cleanPatch(patch: UpdateAppointmentBody): UpdateAppointmentBody {
  const out: any = {};
  if (patch.startsAt) out.startsAt = stripMs(patch.startsAt);
  if (patch.endsAt) out.endsAt = stripMs(patch.endsAt);
  if (typeof patch.reason === "string") {
    const t = patch.reason.trim();
    if (t) out.reason = t;
  }
  if (typeof patch.location === "string") {
    const t = patch.location.trim();
    if (t) out.location = t;
  }
  if (typeof patch.notes === "string") {
    const t = patch.notes.trim();
    if (t) out.notes = t;
  }
  if (patch.status) out.status = patch.status; // "CONFIRMED" | "DONE" | ...
  return out;
}


export async function fetchAppointments(params: ListParams = {}): Promise<PageResponse<AppointmentDTO>> {
  const search = new URLSearchParams();
  if (params.from) search.set("from", params.from);
  if (params.to) search.set("to", params.to);
  if (params.doctorId) search.set("doctorId", params.doctorId);
  if (params.patientId) search.set("patientId", params.patientId);
  search.set("page", String(params.page ?? 1));
  search.set("pageSize", String(params.pageSize ?? 15));

  const raw: any = await api.get(`appointments?${search.toString()}`).json();

  // --- NORMALISATION ICI ---
  const items: AppointmentDTO[] = raw.items ?? [];
  const meta = raw.meta ?? {
    page: Number(raw.page ?? params.page ?? 1),
    pageSize: Number(raw.pageSize ?? raw.limit ?? params.pageSize ?? 15),
    total: Number(raw.total ?? 0),
  };

  return { items, meta };
}

export async function fetchAppointment(id: string): Promise<AppointmentDTO> {
  return api.get(`appointments/${id}`).json();
}

export type CreateAppointmentBody = {
  patientId: string;
  doctorId: string;
  startsAt: string; // ISO
  endsAt: string;   // ISO
  reason?: string;
  status?: AppointmentDTO["status"];
  location?: string;
  notes?: string;
};

export async function createAppointment(body: CreateAppointmentBody): Promise<AppointmentDTO> {
  return api.post("appointments", { json: body }).json();
}

export type UpdateAppointmentBody = Partial<Omit<CreateAppointmentBody, "patientId" | "doctorId">> & {
  status?: AppointmentDTO["status"];
};

export async function updateAppointment(id: string, patch: UpdateAppointmentBody): Promise<AppointmentDTO> {
  const body = cleanPatch(patch);
  try {
    // ⚠️ passe en PATCH (beaucoup d'APIs refusent PUT partiel)
    return await api.patch(`appointments/${id}`, { json: body }).json<AppointmentDTO>();
  } catch (e: any) {
    // log utile en dev
    const status = e?.response?.status;
    let details = "";
    try { details = await e.response.json(); } catch { /* noop */ }
    console.error("PATCH /appointments/:id failed", { status, body, details });
    throw e;
  }
}

export async function cancelAppointment(id: string): Promise<{ id: string; status: "CANCELLED" }> {
  return api.delete(`appointments/${id}`).json();
}

export async function forceReminder(id: string): Promise<{ ok: true }> {
  return api.post(`appointments/${id}/reminders`).json();
}
