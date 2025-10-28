// src/routes/Protected.tsx
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../store/auth';
import type { JSX } from 'react';

export function Protected({ children }: { children: JSX.Element }) {
  const { user, isLoading } = useAuth();
  const { pathname } = useLocation()

  if (isLoading) return <div className="p-6 text-sm text-muted">Chargement de la session…</div>;
  if (!user) return <Navigate to="/login" replace />;

  if (user.mustChangePassword && pathname !== '/change-password') {
    return <Navigate to={'/change-password'} replace />
  }

  return children;
}

export function AdminOnly({ children }: { children: JSX.Element }) {
  const { user, isLoading } = useAuth();
  const { pathname } = useLocation();

  if (isLoading) return <div className="p-6 text-sm text-muted">Chargement de la session…</div>;
  if (!user) return <Navigate to="/login" replace />;

  if (user.mustChangePassword && pathname !== '/change-password') {
    return <Navigate to={'/change-password'} replace />
  }
  
  if (user.role !== 'ADMIN') return <Navigate to="/dashboard" replace />;
  return children;
}


export function RequireRole({ allowed, children }:{
  allowed: Array<'ADMIN'|'SECRETARY'|'DOCTOR'>; children: JSX.Element;
}) {
  const { user } = useAuth();
  const loc = useLocation();
  if (!user) return <Navigate to="/login" state={{ from: loc }} replace />;
  if (!allowed.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return children;
}
