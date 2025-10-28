// hooksAppointments.ts (React Query v5)
import {
  useMutation,
  useQuery,
  useQueryClient,
  keepPreviousData,
  type UseMutationOptions,
  type UseQueryOptions,
} from "@tanstack/react-query";
import {
  fetchAppointments,
  fetchAppointment,
  createAppointment,
  updateAppointment,
  deleteAppointment,
  forceReminder,
  type ListParams,
  type ListResponse,
  type AppointmentDTO,
  type CreateAppointmentBody,
  type UpdateAppointmentBody,
} from "./serviceAppointments";

/* ------------------------------- QUERY KEYS ------------------------------- */
const apptKeys = {
  all: ["appointments"] as const,
  lists: () => [...apptKeys.all, "list"] as const, // préfixe des listes
  list: (p: NormalizedParams) => [...apptKeys.lists(), p] as const, // 3 éléments: ["appointments","list", params]
  detail: (id: string) => [...apptKeys.all, "detail", id] as const, // 3 éléments: ["appointments","detail", id]
};

/* --------------------------- PARAMS NORMALIZER ---------------------------- */
type MaybeDate = string | Date;
type NormalizedParams = {
  from?: string;
  to?: string;
  doctorId?: string;
  patientId?: string;
  page: number;
  pageSize: number;
};

function toISO(v?: MaybeDate): string | undefined {
  if (!v) return undefined;
  return typeof v === "string" ? v : v.toISOString();
}


function normalizeParams(p: ListParams): NormalizedParams {
  const MAX = 50;
  const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max);
  return {
    from: toISO(p.from),
    to: toISO(p.to),
    doctorId: p.doctorId,
    patientId: p.patientId,
    page: clamp(p.page ?? 1, 1, 1_000_000),
    pageSize: clamp(p.pageSize ?? 10, 1, MAX),
  };
}




/* --------------------------------- QUERIES -------------------------------- */
type ListQueryOptions = Omit<
  UseQueryOptions<ListResponse<AppointmentDTO>, Error>,
  "queryKey" | "queryFn"
>;

export function useListAppointments(params: ListParams, options?: ListQueryOptions) {
  const norm = normalizeParams(params);
  return useQuery({
    queryKey: apptKeys.list(norm),
    queryFn: () => fetchAppointments(params),
    placeholderData: keepPreviousData,
    ...options,
  });
}

type DetailQueryOptions = Omit<
  UseQueryOptions<AppointmentDTO, Error>,
  "queryKey" | "queryFn" | "enabled"
>;

export function useAppointment(id?: string, options?: DetailQueryOptions) {
  // clé toujours à 3 éléments; si pas d'id, on met une string vide
  const key = apptKeys.detail(id ?? "");
  return useQuery({
    queryKey: key,
    queryFn: () => {
      if (!id) throw new Error("Missing appointment id");
      return fetchAppointment(id);
    },
    enabled: !!id,
    ...options,
  });
}

/* ------------------------------- MUTATIONS -------------------------------- */
export function useCreateAppointment(
  defaultInvalidateParams?: ListParams,
  options?: UseMutationOptions<AppointmentDTO, Error, CreateAppointmentBody>
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateAppointmentBody) => createAppointment(body),
    onSuccess: async () => {
      if (defaultInvalidateParams) {
        await qc.invalidateQueries({
          queryKey: apptKeys.list(normalizeParams(defaultInvalidateParams)),
          exact: true,
        });
      }
      // Invalide toutes les listes
      await qc.invalidateQueries({ queryKey: apptKeys.lists() });
    },
    ...options,
  });
}

type UpdateVars = { id: string; patch: UpdateAppointmentBody };

export function useUpdateAppointment(
  defaultInvalidateParams?: ListParams,
  options?: UseMutationOptions<AppointmentDTO, Error, UpdateVars>
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: UpdateVars) => updateAppointment(id, patch),
    onSuccess: async (_data, vars) => {
      if (defaultInvalidateParams) {
        await qc.invalidateQueries({
          queryKey: apptKeys.list(normalizeParams(defaultInvalidateParams)),
          exact: true,
        });
      }
      await qc.invalidateQueries({ queryKey: apptKeys.detail(vars.id) });
      await qc.invalidateQueries({ queryKey: apptKeys.lists() });
    },
    ...options,
  });
}

export function useDeleteAppointment(
  defaultInvalidateParams?: ListParams,
  options?: UseMutationOptions<{ id: string; status: "CANCELLED" }, Error, string>
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteAppointment(id),
    onSuccess: async (_data, id) => {
      if (defaultInvalidateParams) {
        await qc.invalidateQueries({
          queryKey: apptKeys.list(normalizeParams(defaultInvalidateParams)),
          exact: true,
        });
      }
      await qc.invalidateQueries({ queryKey: apptKeys.detail(id) });
      await qc.invalidateQueries({ queryKey: apptKeys.lists() });
    },
    ...options,
  });
}

export function useForceReminder(
  options?: UseMutationOptions<{ ok: boolean }, Error, string>
) {
  return useMutation({
    mutationFn: (id: string) => forceReminder(id),
    ...options,
  });
}
