import ky from 'ky';
import { tokensStorage } from './storage';

const baseURL = import.meta.env.VITE_API_URL;

export const api = ky.create({
  prefixUrl: baseURL,
  hooks: {
    beforeRequest: [
      (req) => {
        const access = tokensStorage.getAccess();
        if (access) req.headers.set('Authorization', `Bearer ${access}`);
        req.headers.set('Content-Type', 'application/json');
      }
    ],
    afterResponse: [
      async (req, _opt, res) => {
        if (res.status !== 401) return;
        // tente refresh
        const refresh = tokensStorage.getRefresh();
        if (!refresh) return; // pas de refresh → laisser 401

        const r = await fetch(`${baseURL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: refresh }),
        });
        if (!r.ok) {
          tokensStorage.clearAll();
          return; 
        }
        const data = await r.json();
        tokensStorage.setAccess(data.accessToken);
        tokensStorage.setRefresh(data.refreshToken);
        // rejoue la requête originale avec nouveau header
        const retryHeaders = new Headers(req.headers);
        retryHeaders.set('Authorization', `Bearer ${data.accessToken}`);
        return fetch(req, { headers: retryHeaders });
      }
    ]
  }
});

