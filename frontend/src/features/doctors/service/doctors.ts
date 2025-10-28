/* eslint-disable @typescript-eslint/no-explicit-any */
import { api } from "@/lib/api";

export type DoctorProfile = {
  phone?: string | null;
  bio?: string | null;
  specialties?: string[]; // toujours un array côté UI
};

export type DoctorDTO = {
  id: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  doctorProfile?: DoctorProfile;
};

export type Order = "asc" | "desc";

export type PageMeta = {
  page: number;
  pageSize: number;
  total: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

export type PageResponse<T> = { items: T[]; meta: PageMeta };

export type ListParams = {
  q?: string;
  specialty?: string;
  page?: number;
  pageSize?: number;
  orderBy?: "firstName" | "lastName" | "email" | "createdAt";
  order?: Order;
};

// ---------- Normalisations ----------

function pickProfile(x: any): DoctorProfile | null {
  // Accepte les trois variantes renvoyées par le back ou d'anciens formats
  const dp = x?.DoctorProfile ?? x?.doctorProfile ?? x?.profile ?? null;
  if (!dp) return null;
  const specialties = Array.isArray(dp.specialties) ? dp.specialties : [];
  return {
    specialties,
    phone: dp.phone ?? null,
    bio: dp.bio ?? null,
  };
}

function normalizeOne(x: any): DoctorDTO {
  return {
    id: x.id,
    firstName: x.firstName ?? "",
    lastName: x.lastName ?? "",
    email: x.email ?? null,
    doctorProfile: pickProfile(x) ?? { specialties: [], phone: null, bio: null },
  };
}

// Normalise une réponse de liste (peu importe les clés réelles du back)
function normalizeList(resp: any): PageResponse<DoctorDTO> {
  const items =
    Array.isArray(resp?.items)
      ? resp.items
      : Array.isArray(resp?.data)
      ? resp.data
      : Array.isArray(resp?.results)
      ? resp.results
      : [];

  const metaSrc = resp?.meta ?? resp?.pagination ?? {};
  const page = Number(metaSrc.page ?? 1);
  const pageSize = Number(metaSrc.pageSize ?? metaSrc.limit ?? items.length ?? 10);
  const total = Number(metaSrc.total ?? metaSrc.count ?? items.length ?? 0);
  const hasNextPage = Boolean(metaSrc.hasNextPage ?? page * pageSize < total);
  const hasPreviousPage = Boolean(metaSrc.hasPreviousPage ?? page > 1);

  return {
    items: items.map((d: any) => normalizeOne(d)),
    meta: { page, pageSize, total, hasNextPage, hasPreviousPage },
  };
}

// ---------- API calls (KY correct) ----------

export async function fetchDoctors(params: ListParams): Promise<PageResponse<DoctorDTO>> {
  try {
    const raw = await api.get("doctors", { searchParams: params }).json<any>();
    return normalizeList(raw);
  } catch (e: any) {
    // ky lève une HTTPError; on neutralise le 403 pour ne pas polluer la console/UX
    const status = e?.response?.status ?? (e?.name === "HTTPError" ? 500 : undefined);
    if (status === 403) {
      return {
        items: [],
        meta: {
          page: Number(params.page ?? 1),
          pageSize: Number(params.pageSize ?? 0),
          total: 0,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      };
    }
    throw e; 
  }
}


export async function fetchDoctorById(id: string): Promise<DoctorDTO> {
  // /doctors/:id renvoie l’objet avec "DoctorProfile"
  const raw = await api.get(`doctors/${id}`).json<any>();
  return normalizeOne(raw);
}

export async function fetchDoctorSpecialties(): Promise<string[]> {
  // /doctors/specialties renvoie string[] (déjà distinct/trié côté back)
  const raw = await api.get("doctors/specialties").json<any>();
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
      if (Array.isArray(parsed?.items)) return parsed.items;
      if (Array.isArray(parsed?.specialties)) return parsed.specialties;
    } catch {
      return [];
    }
  }
  if (Array.isArray(raw?.items)) return raw.items;
  if (Array.isArray(raw?.specialties)) return raw.specialties;
  return [];
}

// ---------- Mises à jour ----------
function emptyToNull(s?: string | null) {
  if (s == null) return null;
  const t = String(s).trim();
  return t === "" ? null : t;
}
function normSpecialties(arr?: string[] | null): string[] | undefined {
  if (!arr) return undefined;                  // n’envoie pas la clé si elle est absente
  const cleaned = arr.map(s => String(s).trim()).filter(Boolean);
  // Si ton back refuse [] (array vide), alors retourne undefined quand aucune valeur
  return cleaned.length ? cleaned : undefined;
} 


export async function updateDoctorProfile(
  id: string,
  body: { phone?: string | null; bio?: string | null; specialties?: string[] }
): Promise<DoctorDTO> {
  try {
    const payload = {
      phone: emptyToNull(body.phone),
      bio: emptyToNull(body.bio),
      specialties: normSpecialties(body.specialties), // string[] | undefined
    };
    const raw = await api.put(`doctors/${id}/profile`, { json: payload }).json<any>();
    return normalizeOne(raw);
  } catch (e: any) {
    // aide au debug : affiche la vraie erreur renvoyée par l'API
    if (e?.name === "HTTPError" && e.response) {
      try {
        const msg = await e.response.json();
        throw new Error(`HTTP ${e.response.status} – ${typeof msg === "string" ? msg : JSON.stringify(msg)}`);
      } catch {
        throw new Error(`HTTP ${e.response.status}`);
      }
    }
    throw e;
  }
}

// ---------- Utils ----------

export function toSpecialtyArray(input?: string): string[] {
  if (!input) return [];
  return input
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}
