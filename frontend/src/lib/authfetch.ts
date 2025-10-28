import { tokensStorage } from '@/lib/storage';

const API = import.meta.env.VITE_API_URL; 

export async function authFetch(
  url: string,
  init: RequestInit = {},
  { withCredentials = false }: { withCredentials?: boolean } = {}
) {
  const access = tokensStorage.getAccess();
  const headers = new Headers(init.headers || {});
  if (access) headers.set('Authorization', `Bearer ${access}`);

  const first = await fetch(url, {
    ...init,
    headers,
    credentials: withCredentials ? 'include' : init.credentials,
  });

  if (first.status !== 401) return first;

  // 401 -> tenter refresh
  const refresh = tokensStorage.getRefresh();
  if (!refresh) return first; // pas de refresh, on renvoie le 401

  const r = await fetch(`${API}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: refresh }),
    credentials: withCredentials ? 'include' : undefined,
  });
  if (!r.ok) {
    tokensStorage.clearAll();
    return first; // session morte -> laisse 401 remonter
  }
  const data = await r.json();
  tokensStorage.setAccess(data.accessToken);
  tokensStorage.setRefresh(data.refreshToken);

  // rejoue la requête originale avec le nouveau token
  const retryHeaders = new Headers(init.headers || {});
  retryHeaders.set('Authorization', `Bearer ${data.accessToken}`);

  return fetch(url, {
    ...init,
    headers: retryHeaders,
    credentials: withCredentials ? 'include' : init.credentials,
  });
}
