/* eslint-disable @typescript-eslint/no-explicit-any */
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchPatientById } from '../services/servicePatients';
import { Button } from '@/components/ui/ButtonUI';
import { useAuth } from '../../../store/auth';

function fmtDate(iso?: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString();
}

export default function PatientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const role = user?.role;

  const q = useQuery({
    queryKey: ['patient', id],
    queryFn: () => fetchPatientById(id!),
    enabled: Boolean(id),
  });

  if (!id) return <div className="p-6 text-[color:var(--danger)]">ID manquant.</div>;
  if (q.isLoading) return <div className="p-6">Chargement…</div>;
  if (q.isError) return <div className="p-6 text-[color:var(--danger)]">{String((q.error as any)?.message ?? 'Erreur')}</div>;
  if (!q.data) return <div className="p-6">Patient introuvable.</div>;

  const p = q.data;
  const full = `${p.firstName} ${p.lastName}`.trim();
  const canEdit =
    role === 'ADMIN' || role === 'SECRETARY' || (role === 'DOCTOR' && p.ownerId === user?.id);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">{full}</h1>
        {canEdit && (
          <Link to={`/patients/${id}/edit`}><Button>Éditer</Button></Link>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card p-4"><div className="text-xs text-muted">Naissance</div><div>{fmtDate(p.birthDate)}</div></div>
        <div className="card p-4"><div className="text-xs text-muted">Téléphone</div><div>{p.phone || '—'}</div></div>
        <div className="card p-4"><div className="text-xs text-muted">Email</div><div>{p.email || '—'}</div></div>
        <div className="card p-4"><div className="text-xs text-muted">Adresse</div><div>{p.address || '—'}</div></div>
        <div className="card p-4"><div className="text-xs text-muted">Assurance</div><div>{p.assuranceNumber || '—'}</div></div>
        <div className="card p-4"><div className="text-xs text-muted">Médecin</div><div>{p.doctorName || `${p.owner?.firstName ?? ''} ${p.owner?.lastName ?? ''}`.trim() || '—'}</div></div>
        <div className="card p-4 md:col-span-2"><div className="text-xs text-muted">Notes</div><div className="whitespace-pre-wrap">{p.notes || '—'}</div></div>
      </div>
    </div>
  );
}
