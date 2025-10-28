/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { api } from '@/lib/api';

export type Order = 'asc' | 'desc';

export type PageMeta = {
  mode: 'offset' | 'cursor';
  total?: number;
  page?: number;
  pageSize?: number;
  hasNextPage?: boolean;
  hasPreviousPage?: boolean;
  nextCursor?: string | null;
  previousCursor?: string | null;
  orderBy?: string;
  order?: Order;
};

export type PageResponse<T> = { items: T[]; meta: PageMeta };

export type Patient = {
  id: string;
  firstName: string;
  lastName: string;
  birthDate?: string | null; // YYYY-MM-DD
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  assuranceNumber?: string | null;
  doctorName?: string | null;
  notes?: string | null;

  ownerId: string;
  owner?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;

  createdAt: string;
  updatedAt?: string | null;
};

export type PatientsQuery = {
  q?: string;
  ownerId?: string;
  page?: number | string;
  pageSize?: number | string;
  orderBy?: string;
  order?: Order;
};

export type CreatePatientDTO = {
  firstName: string;
  lastName: string;
  birthDate?: string | null; 
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  assuranceNumber?: string | null;
  doctorName?: string | null;
  notes?: string | null;
  ownerId: string; // <- on le garde dans le type UI mais on NE L’ENVOIE PAS
};

export type UpdatePatientDTO = Partial<CreatePatientDTO>;

// ----------------- helpers -----------------

function cleanParams<T extends Record<string, any>>(params: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== '' && v !== null && v !== undefined)
  ) as Partial<T>;
}

function emptyToUndef<T extends Record<string, any>>(obj: T): Partial<T> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === '' || v === null || v === undefined) continue;
    if (typeof v === 'string') {
      const t = v.trim();
      if (t === '') continue;
      out[k] = t;
    } else {
      out[k] = v;
    }
  }
  return out as Partial<T>;
}

// Normalise la date de naissance à "YYYY-MM-DD" ou omet le champ
function normalizeBirthDate(s?: string | null) {
  if (!s) return undefined;
  const t = s.trim();
  if (!t) return undefined;
  // tolère "YYYY-MM-DDTHH:mm" venant d'un <input type="date|datetime-local">
  const m = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : undefined;
}

// Optionnel: remonter un message lisible en dev
async function throwWithDetails(e: any) {
  if (e?.name === 'HTTPError' && e.response) {
    try {
      const data = await e.response.json();
      throw new Error(
        `HTTP ${e.response.status} – ${typeof data === 'string' ? data : JSON.stringify(data)}`
      );
    } catch {
      throw new Error(`HTTP ${e.response.status}`);
    }
  }
  throw e;
}

// ----------------- API -----------------

export async function fetchPatients(params: PatientsQuery) {
  const cp = cleanParams(params);
  return api.get('patients', { searchParams: cp }).json<PageResponse<Patient>>();
}

export async function fetchPatientById(id: string) {
  return api.get(`patients/${id}`).json<Patient>();
}

export async function createPatient(payload: CreatePatientDTO) {
  try {
    // on enlève ownerId (souvent interdit côté back) + champs vides
    const {
      ownerId: _omitOwner, 
      birthDate,
      ...rest
    } = payload;

    const body = {
      ...emptyToUndef(rest),
      birthDate: normalizeBirthDate(birthDate),
    };

    // firstName / lastName doivent exister et non vides
    if (!body['firstName'] || !body['lastName']) {
      throw new Error('firstName et lastName sont requis');
    }

    return await api.post('patients', { json: body }).json<Patient>();
  } catch (e: any) {
    await throwWithDetails(e);
  }
}

export async function updatePatient(id: string, payload: UpdatePatientDTO) {
  try {
    const {
      ownerId: _omitOwner, 
      birthDate,
      ...rest
    } = payload;

    const body = {
      ...emptyToUndef(rest),
      birthDate: normalizeBirthDate(birthDate),
    };

    return await api.put(`patients/${id}`, { json: body }).json<Patient>();
  } catch (e: any) {
    await throwWithDetails(e);
  }
}

export async function deletePatient(id: string) {
  await api.delete(`patients/${id}`);
}
