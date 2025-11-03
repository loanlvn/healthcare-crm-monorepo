export type Role = "ADMIN" | "DOCTOR" | "SECRETARY";

export type ApptStatus = "SCHEDULED" | "CONFIRMED" | "CANCELLED" | "NO_SHOW" | "DONE";

export type UserLite = { id: string; firstName: string; lastName: string };
export type PatientLite = { id: string; firstName: string; lastName: string };

export type AppointmentDTO = {
  id: string;
  patientId: string;
  doctorId: string;
  startsAt: string;  // ISO
  endsAt: string;    // ISO
  reason?: string | null;
  status: ApptStatus;
  location?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  patient?: PatientLite;
  doctor?: UserLite;
};

export type ListParams = {
  from?: string; // ISO
  to?: string;   // ISO
  doctorId?: string;
  patientId?: string;
  page?: number;
  pageSize?: number;
};

export type ListResponse<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
};

export type PageMeta = {
  page: number;
  pageSize: number;
  total: number;
};

export type PageResponse<T> = { items: T[]; meta: PageMeta };

