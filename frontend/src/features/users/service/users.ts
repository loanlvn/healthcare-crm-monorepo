import { api } from '@/lib/api'; 
import type { User, UpdateUserDTO, CreateUserDTO } from '../../../lib/types';
import { authFetch } from '@/lib/authfetch';
 
export type UsersPage = {
  items: User[];
  total: number;
  page: number; 
  limit: number; 
};

export async function createUser(payload: CreateUserDTO){
    return api.post('users', { json: payload }).json<User>();
}

export async function fetchUsers(params: { page?: number; limit?: number; q?: string }) {
  return api.get('users', {
    searchParams: {
      ...(params.page ? { page: String(params.page) } : {}),
      ...(params.limit ? { limit: String(params.limit) } : {}),
      ...(params.q ? { q: params.q } : {}),
    },
  }).json<UsersPage>();
}

export async function fetchUserById(id: string) {
  return api.get(`users/${id}`).json<User>();
}

export async function updateUser(id: string, payload: UpdateUserDTO) {
  return api.put(`users/${id}`, { json: payload }).json<User>();
}

// Endpoint dédié : désactivation -> isActive devient false côté backend
export async function disableUser(id: string) {
  return api.put(`users/${id}/disable`).json<User>();
}

// service upload avatar

export async function uploadMyAvatar(file: File) {
  const fd = new FormData();
  fd.append('file', file); // DOIT s'appeler "file"

  const API = import.meta.env.VITE_API_URL; // ex: http://localhost:4000/api
  const res = await authFetch(`${API}/users/me/avatar`, {
    method: 'POST',
    body: fd, // surtout pas de Content-Type manuel
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error ?? `HTTP_${res.status}`);
  }
  return res.json() as Promise<{ id: string; avatarUrl: string }>;
}


