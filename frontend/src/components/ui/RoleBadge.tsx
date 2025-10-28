import { Shield, Users2, User2 } from 'lucide-react';

type RoleLike = 'ADMIN' | 'DOCTOR' | 'SECRETARY' | 'PATIENT';

export function RoleBadge({ role }: { role: RoleLike }) {
  const style =
    role === 'ADMIN'
      ? { bg: 'color-mix(in oklab, var(--primary) 16%, transparent)', fg: 'var(--primary)' }
      : role === 'DOCTOR'
      ? { bg: 'color-mix(in oklab, var(--success) 16%, transparent)', fg: 'var(--success)' }
      : role === 'SECRETARY'
      ? { bg: 'color-mix(in oklab, var(--warning) 26%, transparent)', fg: 'var(--warning)' }
      : { 
          bg: 'color-mix(in oklab, oklch(65% 0.12 250) 22%, transparent)',
          fg: 'oklch(55% 0.14 250)',
        };

  const Icon =
    role === 'ADMIN' ? Shield
    : role === 'PATIENT' ? User2
    : Users2;

  return (
    <span
      className="badge"
      style={{ background: style.bg, borderColor: 'var(--border)', color: style.fg }}
    >
      <Icon size={14} />
      <span className="ml-1">{role}</span>
    </span>
  );
}
