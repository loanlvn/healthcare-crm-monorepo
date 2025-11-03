/* eslint-disable @typescript-eslint/no-explicit-any */
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { fetchPatients, fetchPatientById } from "./servicePatients";
import { useAuth } from "@/store/auth";

export type Order = "asc" | "desc";
export type PatientsQuery = {
  q?: string;
  ownerId?: string; 
  page?: number;
  pageSize?: number;
  orderBy?: "firstName" | "lastName" | "createdAt" | "updatedAt";
  order?: Order;
};

export type PatientsPageMeta = {
  mode: "offset";
  page: number;
  pageSize: number;
  total: number;
  orderBy?: string;
  order?: Order;
};
export type PatientLite = {
  id: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  email?: string | null;
};

export type PatientsPage = {
  items: PatientLite[];
  meta: PatientsPageMeta;
};

export function usePatients(q: PatientsQuery) {
  return useQuery({
    queryKey: ["patients", q],
    // on conserve la signature exacte de ton service
    queryFn: () => fetchPatients(q as any) as Promise<PatientsPage>,
    placeholderData: keepPreviousData,
    staleTime: 10_000,
  });
}

export function usePatient(id?: string) {
  return useQuery({
    queryKey: ["patient", id],
    queryFn: () => fetchPatientById(id!) as Promise<PatientLite>,
    enabled: !!id,
  });
}

/** Sélecteur : force ownerId pour les DOCTOR */
export function usePatientsForPicker(
  input: Omit<PatientsQuery, "ownerId"> & { ownerId?: string }
) {
  const { user } = useAuth();
  const isDoctor = user?.role === "DOCTOR";
  const forcedOwner = isDoctor ? user?.id : input.ownerId;

  const q: PatientsQuery = {
    orderBy: input.orderBy ?? "lastName",
    order: input.order ?? "asc",
    page: input.page ?? 1,
    pageSize: input.pageSize ?? 20,
    q: input.q,
    ownerId: forcedOwner,
  };
  return usePatients(q);
}

