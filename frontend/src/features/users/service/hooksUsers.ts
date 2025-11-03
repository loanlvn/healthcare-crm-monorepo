import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { directoryUsers } from "../../chat/service/serviceChat2";

export type UserRole = "ADMIN" | "DOCTOR" | "SECRETARY";
export type RolePick = UserRole | "ALL";

export type UserLite = {
  id: string;
  firstName: string;
  lastName: string;
  role: UserRole;
};

export type UsersPickResult = {
  items: UserLite[];
  page: number;
  limit: number;
  total: number;
};

type Params = { q?: string; role?: RolePick; page?: number; limit?: number };


export function useUserPicker(params: Params = {}): UseQueryResult<UsersPickResult> {
  const q = params.q ?? "";
  const page = params.page ?? 1;
  const limit = params.limit ?? 20;

  const roleParam =
    params.role && params.role !== "ALL"
      ? (params.role as Exclude<RolePick, "ALL">) // "ADMIN" | "DOCTOR" | "SECRETARY"
      : undefined;

  return useQuery<UsersPickResult>({
    queryKey: ["chat", "directory", { q, role: roleParam ?? "ALL", page, limit }],
    queryFn: async () => {
      const res = await directoryUsers({ q, role: roleParam, page, limit });
      return {
        items: res.items as UserLite[],
        page: res.page,
        limit: res.limit,
        total: res.total,
      };
    },
    staleTime: 30_000,
  });
}

export function useAllInternals(opts?: { q?: string; page?: number; limit?: number }) {
  return useUserPicker({ role: "ALL", ...opts });
}
