/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useMemo } from 'react';
import { Outlet, NavLink, Link } from 'react-router-dom';
import { useAuth } from '../store/auth';
import { cn } from '../lib/cn';
import { 
  LayoutDashboard, Users2, User2, CalendarClock, LogOut, 
  Menu, X, Shield, MessageSquare, CreditCard, FileText
} from 'lucide-react';
import { useUnreadSummary } from '../features/chat/service/hooks2';
import Avatar from '@/components/widget/Avatar';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export default function AppLayout() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const { data: unread } = useUnreadSummary({ enabled: !!user });
  const unreadTotal = unread?.total ?? 0;

  const navItems = useMemo(() => {
    const base = [
      { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
      { to: "/patients", icon: User2, label: "Patients" },
      { to: "/chat", icon: MessageSquare, label: "Messages" },
      { to: "/appointments", icon: CalendarClock, label: "Rendez-vous" },
      { to: "/billing/invoices", icon: FileText, label: "Factures" },
      { to: "/billing/payments", icon: CreditCard, label: "Paiements" },
    ];
    if (user?.role === "ADMIN" || user?.role === "SECRETARY") {
      base.splice(3, 0, { to: "/doctors", icon: Users2, label: "Médecins" });
    }
    if (user?.role === "ADMIN")
      base.splice(2, 0, { to: "/users", icon: Users2, label: "Utilisateurs" });
    return base;
  }, [user?.role]);

  return (
    <div className="min-h-screen w-full grid lg:grid-cols-[260px_1fr]">
      {/* Sidebar desktop */}
      <aside className="hidden lg:flex lg:flex-col border-r border-token surface">
        <Brand />
        <nav className="px-3 py-2 space-y-1">
          {navItems.map(n => (
            <SidebarLink key={n.to} to={n.to} icon={<n.icon size={16} />} label={n.label} badgeCount={n.to === '/chat' ? unreadTotal : undefined} />
          ))}
        </nav>
        <div className="mt-auto p-3">
          <MeCard />
        </div>
      </aside>

      {/* Drawer mobile */}
      <MobileDrawer open={open} onClose={() => setOpen(false)} nav={navItems} />
         
      {/* Main */}
      <section className="min-h-screen flex flex-col">
        <HeaderBar onOpenMenu={() => setOpen(true)} onLogout={logout} />
        <div className="flex-1 overflow-auto p-4 md:p-6">
          <div className="mx-auto max-w-6xl">
            <Outlet />
          </div>
        </div>
      </section>
    </div>
  );
}

/* --------------------------- Sub-components --------------------------- */

function Brand() {
  return (
    <div className="h-14 flex items-center justify-between px-3 border-b border-token">
      <Link to="/" className="flex items-center gap-2 font-semibold">
        <div className="inline-grid h-8 w-8 place-items-center rounded-xl text-white"
             style={{ background: 'var(--primary)' }}>
          HC
        </div>
        <span className="tracking-tight">HealthCRM</span>
      </Link>
      <span className="text-[10px] px-1.5 py-0.5 rounded border border-token text-muted">Privé</span>
    </div>
  );
}

function HeaderBar({ onOpenMenu, onLogout }: { onOpenMenu: () => void; onLogout: () => void }) {
  const { user } = useAuth();
  return (
    <header className="sticky top-0 z-20 h-14 flex items-center gap-2 border-b border-token surface/80 backdrop-blur px-3 md:px-4">
      {/* Menu (mobile) */}
      <button
        className="lg:hidden btn btn-outline"
        onClick={onOpenMenu}
        aria-label="Ouvrir le menu"
      >
        <Menu size={18} />
        <span className="text-sm">Menu</span>
      </button>

      <div className="ml-auto flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-2 text-sm text-muted">
          <span>Connecté :</span>
          <strong className="text-[color:var(--fg)]">{user?.firstName} {user?.lastName}</strong>
          {user?.role && <RoleBadge role={user.role} />}
        </div>
        <button onClick={onLogout} className="btn btn-ghost" title="Se déconnecter">
          <LogOut size={16} />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
}

function MeCard() {
  const { user } = useAuth();
  
  const { data: me } = useQuery({
    queryKey: ["me", user?.id], 
    queryFn: () => api.get("users/me").json<{
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      role: "ADMIN" | "DOCTOR" | "SECRETARY";
      isActive: boolean;
      createdAt: string;
      updatedAt?: string;
      avatarUrl?: string | null;
    }>(),
    staleTime: 60_000,
    enabled: !!user, 
  });

  if (!user) return null;

  const profile = me ?? user;

  const ASSETS = import.meta.env.VITE_ASSETS_URL || "http://localhost:4000";
  const avatarPath = profile.avatarUrl || undefined;
  const version = profile.updatedAt || profile.createdAt || "";
  const avatarSrc = avatarPath ? avatarPath : undefined;

  return (
    <div className="card p-3">
      <div className="flex items-center gap-3">
        <div
          className="h-9 w-9 rounded-full grid place-items-center"
          style={{ background: "color-mix(in oklab, var(--surface) 85%, var(--border))" }}
        >
          <Avatar
            src={avatarSrc}
            baseUrl={ASSETS}
            bust={version}
            size={32}
            rounded="full"
            withBorder={false}
            initials={`${profile.firstName?.[0] ?? ""}${profile.lastName?.[0] ?? ""}`}
          />
        </div>
        <div className="min-w-0">
          <div className="font-medium truncate">
            {profile.firstName} {profile.lastName}
          </div>
          <div className="text-xs text-muted truncate">{profile.email}</div>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <RoleBadge role={profile.role} />
        {profile.isActive ? (
          <span
            className="badge text-[oklch(50% 0.05 150)]"
            style={{ background: "color-mix(in oklab, var(--success) 18%, transparent)" }}
          >
            Actif
          </span>
        ) : (
          <span
            className="badge text-[oklch(55% 0.20 25)]"
            style={{ background: "color-mix(in oklab, var(--danger) 18%, transparent)" }}
          >
            Désactivé
          </span>
        )}
      </div>

      <Link to="/me" className="mt-3 w-full btn btn-outline justify-center">
        Voir mon profil
      </Link>
    </div>
  );
}

function RoleBadge({ role }: { role: 'ADMIN'|'DOCTOR'|'SECRETARY' }) {
  const style = role === 'ADMIN'
    ? { bg: 'color-mix(in oklab, var(--primary) 16%, transparent)', fg: 'var(--primary)' }
    : role === 'DOCTOR'
    ? { bg: 'color-mix(in oklab, var(--success) 16%, transparent)', fg: 'var(--success)' }
    : { bg: 'color-mix(in oklab, var(--warning) 26%, transparent)', fg: 'var(--warning)' };
  return (
    <span className="badge"
          style={{ background: style.bg, borderColor: 'var(--border)', color: style.fg }}>
      {role === 'ADMIN' ? <Shield size={14} /> : <Users2 size={14} />}
      <span className="ml-1">{role}</span>
    </span>
  );
}

function SidebarLink({ to, icon, label, badgeCount }: { to: string; icon: React.ReactNode; label: string; badgeCount?: number }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-sm',
          isActive
            ? 'text-[color:var(--primary)]'
            : 'text-muted hover:bg-[color:color-mix(in oklab, var(--surface) 92%, var(--border))] hover:text-[color:var(--fg)]'
        )
      }
      end
    >
      <span className="flex items-center gap-2">
        {icon}
        <span>{label}</span>
      </span>
      {badgeCount && badgeCount > 0 && (
        <span className="inline-flex items-center justify-center text-[11px] px-2 py-0.5 rounded-full bg-primary text-primary-foreground">
          {badgeCount}
        </span>
      )}
    </NavLink>
  );
}

function MobileDrawer({
  open,
  onClose,
  nav
}: {
  open: boolean;
  onClose: () => void;
  nav: { to: string; icon: any; label: string }[];
}) {
  const { user } = useAuth();
  return (
    <>
      <div
        className={cn(
          'lg:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] transition-opacity',
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
        onClick={onClose}
      />
      <div
        className={cn(
          'lg:hidden fixed inset-y-0 left-0 z-50 w-[82%] max-w-[300px] -translate-x-full surface border-r border-token flex flex-col transition-transform',
          open && 'translate-x-0'
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation"
      >
        <div className="h-14 flex items-center justify-between px-3 border-b border-token">
          <Brand />
          <button className="btn btn-ghost -mr-1" onClick={onClose} aria-label="Fermer">
            <X size={18} />
          </button>
        </div>
        <nav className="px-3 py-2 space-y-1">
          {nav.map(n => (
            <SidebarLink key={n.to} to={n.to} icon={<n.icon size={16} />} label={n.label} />
          ))}
        </nav>
        <div className="mt-auto p-3">{user && <MeCard />}</div>
      </div>
    </>
  );
}
