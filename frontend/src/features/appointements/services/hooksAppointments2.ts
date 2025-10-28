/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import {
  fetchAppointments, fetchAppointment,
  createAppointment, updateAppointment, cancelAppointment, forceReminder,
  type UpdateAppointmentBody
} from "./serviceAppointments2";
import type { ListParams, AppointmentDTO, PageResponse } from "../types/AppointmentsTypes";

const keys = {
  list: (p: ListParams) => ["appointments", "list", p] as const,
  detail: (id: string) => ["appointments", "detail", id] as const,
};

export function useListAppointments(params: ListParams) {
  return useQuery<PageResponse<AppointmentDTO>, any>({
    queryKey: keys.list(params),
    queryFn: () => fetchAppointments(params),
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  });
}

export function useAppointment(id?: string) {
  return useQuery<AppointmentDTO, any>({
    queryKey: id ? keys.detail(id) : ["appointments", "detail", null],
    queryFn: () => fetchAppointment(id!),
    enabled: Boolean(id),
    staleTime: 15_000,
  });
}

export function useCreateAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createAppointment,
    onSuccess: (_data, _vars, _ctx) => {
      qc.invalidateQueries({ queryKey: ["appointments", "list"] });
    },
  });
}

export function useUpdateAppointment(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: UpdateAppointmentBody) => updateAppointment(id, patch),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ["appointments", "list"] });
      qc.setQueryData(keys.detail(id), updated);
    },
  });
}

export function useCancelAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: cancelAppointment,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["appointments", "list"] });
    },
  });
}

export function useForceReminder() {
  return useMutation({ mutationFn: forceReminder });
}


export function useDebouncedValue<T>(value: T, delay = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return v;
}
