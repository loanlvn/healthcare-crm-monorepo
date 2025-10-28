/* eslint-disable @typescript-eslint/no-explicit-any */
import { api } from "@/lib/api";

/* ===== Types ===== */
export type ApptStatus = "SCHEDULED" | "CONFIRMED" | "CANCELLED" | "NO_SHOW" | "DONE";

export type MiniUser = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
};
export type MiniPatient = MiniUser;

export type AppointmentDTO = {
  id: string;
  patientId: string;
  doctorId: string;
  startsAt: string; // ISO
  endsAt: string;   // ISO
  reason?: string | null;
  status: ApptStatus;
  location?: string | null;
  notes?: string | null;
  createdAt: string; // ISO
  updatedAt: string; // ISO
  patient?: MiniPatient | null;
  doctor?: MiniUser | null;
};

export type ListResponse<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
};

type MaybeDate = string | Date;

export type ListParams = {
  from?: MaybeDate;   // ISO string ou Date
  to?: MaybeDate;     // ISO string ou Date
  doctorId?: string;
  patientId?: string;
  page?: number;
  pageSize?: number;
};

/* ===== Utils ===== */
function toISO(v?: MaybeDate): string | undefined {
  if (!v) return undefined;
  return typeof v === "string" ? v : v.toISOString();
}

// serviceAppointments.ts (extraits pertinents)

// serviceAppointments.ts
const MAX_PAGE_SIZE = 50;
const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max);

function buildSearchParams(params: ListParams): URLSearchParams {
  const sp = new URLSearchParams();

  // Normalise/valide dates
  let from = toISO(params.from);
  let to = toISO(params.to);
  if (from && to && Date.parse(from) > Date.parse(to)) [from, to] = [to, from];

  // (optionnel) supprime les millisecondes si le back est tatillon
  const stripMs = (iso: string) => iso.replace(/\.\d{3}Z$/, "Z");
  if (from) sp.set("from", stripMs(from));
  if (to) sp.set("to", stripMs(to));

  if (params.doctorId) sp.set("doctorId", params.doctorId);
  if (params.patientId) sp.set("patientId", params.patientId);

  sp.set("page", String(clamp(params.page ?? 1, 1, 1_000_000)));
  sp.set("pageSize", String(clamp(params.pageSize ?? 10, 1, MAX_PAGE_SIZE))); // ✅ pas de "limit"
  return sp;
}



/* ===== API ===== */
// serviceAppointments.ts
export async function fetchAppointments(params: ListParams): Promise<ListResponse<AppointmentDTO>> {
  const searchParams = buildSearchParams(params);
  try {
    return await api.get("appointments", { searchParams }).json<ListResponse<AppointmentDTO>>();
  } catch (e: any) {
    const status = e?.response?.status;
    const body = await e?.response?.text?.();
    console.error("GET /appointments failed", { status, url: `appointments?${searchParams}`, body });
    throw e;
  }
}


export type CreateAppointmentBody = {
  patientId: string;
  doctorId: string;
  startsAt: string; // ISO
  endsAt: string;   // ISO
  reason?: string;
  status?: ApptStatus;
  location?: string;
  notes?: string;
};

export async function createAppointment(
  body: CreateAppointmentBody
): Promise<AppointmentDTO> {
  return api.post("appointments", { json: body }).json<AppointmentDTO>();
}

export type UpdateAppointmentBody = Partial<
  Pick<CreateAppointmentBody, "startsAt" | "endsAt" | "reason" | "status" | "location" | "notes">
>;

export async function updateAppointment(
  id: string,
  body: UpdateAppointmentBody
): Promise<AppointmentDTO> {
  return api.put(`appointments/${id}`, { json: body }).json<AppointmentDTO>();
}

export async function deleteAppointment(
  id: string
): Promise<{ id: string; status: "CANCELLED" }> {
  // Ton backend annule plutôt que de hard-delete: on conserve la forme.
  return api.delete(`appointments/${id}`).json<{ id: string; status: "CANCELLED" }>();
}

export async function forceReminder(
  id: string
): Promise<{ ok: boolean }> {
  return api.post(`appointments/${id}/reminders`).json<{ ok: boolean }>();
}

/* ===== (Optionnel) fetch by id si besoin côté Editor ===== */
export async function fetchAppointment(
  id: string
): Promise<AppointmentDTO> {
  return api.get(`appointments/${id}`).json<AppointmentDTO>();
}
