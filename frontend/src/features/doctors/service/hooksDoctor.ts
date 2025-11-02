/* eslint-disable @typescript-eslint/no-explicit-any */
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { fetchDoctors, fetchDoctorById } from "./doctors";
import { useAuth } from "@/store/auth";

export type Order = "asc" | "desc";
export type DoctorsQuery = {
  q?: string;
  page?: number;
  pageSize?: number;
  orderBy?: "firstName" | "lastName" | "createdAt" | "updatedAt";
  order?: Order;
};

export type DoctorLite = { id: string; firstName: string; lastName: string; email?: string | null };

export type DoctorsPage = {
  items: DoctorLite[];
  meta: { page: number; pageSize: number; total: number; mode: "offset" };
};

export function useDoctors(q: DoctorsQuery) {
  const { user } = useAuth(); 
  return useQuery({
    queryKey: ["doctors", q, user?.role], 
    queryFn: async () => {
      const response = await fetchDoctors(q as any);
      return {
        items: response.items,
        meta: {
          ...response.meta,
          mode: "offset"
        }
      };
    },
    placeholderData: keepPreviousData,
    staleTime: 10_000,
  });
}

export function useDoctor(id?: string) {
  return useQuery({
    queryKey: ["doctor", id],
    queryFn: () => fetchDoctorById(id!) as Promise<DoctorLite>,
    enabled: !!id,
  });
}

export function useDoctorsForPicker(input: DoctorsQuery = {}) {
  const q: DoctorsQuery = {
    orderBy: input.orderBy ?? "lastName",
    order: input.order ?? "asc",
    page: input.page ?? 1,
    pageSize: input.pageSize ?? 20,
    q: input.q
  };
  return useDoctors(q);
}
