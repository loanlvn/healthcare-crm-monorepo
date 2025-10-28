const ACCESS_KEY = 'hc.access';
const REFRESH_KEY = 'hc.refresh';

export const tokensStorage = {
  getAccess: () => localStorage.getItem(ACCESS_KEY) || '',
  setAccess: (t: string) => localStorage.setItem(ACCESS_KEY, t),
  clearAccess: () => localStorage.removeItem(ACCESS_KEY),
  getRefresh: () => localStorage.getItem(REFRESH_KEY) || '',
  setRefresh: (t: string) => localStorage.setItem(REFRESH_KEY, t),
  clearRefresh: () => localStorage.removeItem(REFRESH_KEY),
  clearAll: () => { localStorage.removeItem(ACCESS_KEY); localStorage.removeItem(REFRESH_KEY); },
};
