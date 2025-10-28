/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { User, LoginResponse } from '../lib/types';
import { api } from '../lib/api';
import { tokensStorage } from '../lib/storage'

type AuthCtx = {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
};

const Ctx = createContext<AuthCtx | null>(null);

// Clés locales pour persister le profil (optionnel)
const LS_USER = 'hc.user';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Hydratation initiale : tente un refresh + /users/me si refreshToken présent
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // Pré-hydrate le profil pour éviter le flash
        const cached = localStorage.getItem(LS_USER);
        if (cached) setUser(JSON.parse(cached) as User);

        const rt = tokensStorage.getRefresh();
        if (!rt) return; // pas de session

        // 1) refresh
        const r = await api.post('auth/refresh', {
          json: { refreshToken: rt },
        }).json<{ accessToken: string; refreshToken: string; expiresIn: number }>();

        tokensStorage.setAccess(r.accessToken);
        tokensStorage.setRefresh(r.refreshToken);

        // 2) profil
        try {
          const me = await api.get('users/me').json<User>();
          setUser(me);
        } catch (err: any) {
          const status = err?.response?.status;
          if (status === 403) {
            // token invalide → purge locale
          } else {
            throw err;
          }
        }
      } catch {
        // refresh raté → purge locale
        tokensStorage.clearAll();
        localStorage.removeItem(LS_USER);
        if (mounted) setUser(null);
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  async function login(email: string, password: string) {
    const res = await api.post('auth/login', {
      json: { email, password },
    }).json<LoginResponse>();

    // tokens
    tokensStorage.setAccess(res.accessToken);
    tokensStorage.setRefresh(res.refreshToken);

    // profil
    setUser(res.user);
    localStorage.setItem(LS_USER, JSON.stringify(res.user));
    return res.user;
  }

  async function logout() {
    try {
      const rt = tokensStorage.getRefresh();
      if (rt) {
        await api.post('auth/logout', { json: { refreshToken: rt } }); // idempotent côté backend
      }
    } catch {
      // on ignore : on veut être idempotent côté client aussi
    } finally {
      tokensStorage.clearAll();
      localStorage.removeItem(LS_USER);
      setUser(null);
    }
  }

  const value = useMemo(
    () => ({ user, isLoading, login, logout, setUser }),
    [user, isLoading]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useAuth = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error('AuthProvider manquant');
  return v;
};
