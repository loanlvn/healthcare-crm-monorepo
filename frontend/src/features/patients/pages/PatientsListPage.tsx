/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchPatients } from '../services/servicePatients';
import { fetchDoctors } from '@/features/doctors/service/doctors';
import { Form } from '@/components/widget/Form';
import { useForm } from 'react-hook-form';
import { TextField } from '@/components/widget/TextField';
import { SelectField } from '@/components/widget/SelectField';
import { Button } from '@/components/ui/ButtonUI';
import { useAuth } from '@/store/auth';

type Filters = { q: string; ownerId: string };

export default function PatientsListPage() {
  const { user } = useAuth();
  const [sp, setSp] = useSearchParams();

  const q = sp.get('q') ?? '';
  const ownerId = sp.get('ownerId') ?? '';
  const page = Number(sp.get('page') ?? '1');
  const pageSize = Number(sp.get('pageSize') ?? '10');

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['patients', { q, ownerId, page, pageSize }],
    queryFn: () => fetchPatients({ q, ownerId, page, pageSize, orderBy: 'createdAt', order: 'desc' }),
    staleTime: 10_000,
  });

  // pour la liste des docteurs (pour filtre et assignation dans les pages de formulaire)
  const doctorsQuery = useQuery({
    queryKey: ['doctors', { q: '', specialty: '', page: 1, pageSize: 100 }],
    queryFn: () => fetchDoctors({ page: 1, pageSize: 100, orderBy: 'lastName', order: 'asc' }),
    staleTime: 60_000,
  });

  const doctorOptions = useMemo(() => {
    const arr = doctorsQuery.data?.items ?? [];
    return arr.map(d => ({
      value: d.id,
      label: `${d.firstName} ${d.lastName}`.trim() || d.email,
    }));
  }, [doctorsQuery.data]);

  const filterForm = useForm<Filters>({
    defaultValues: { q, ownerId },
    mode: 'onTouched',
  });

  useEffect(() => {
    filterForm.reset({ q, ownerId });
  }, [q, ownerId]);

  function apply(param: 'q' | 'ownerId', value: string) {
    const next = new URLSearchParams(sp);
    if (value) next.set(param, value); else next.delete(param);
    next.set('page', '1');
    setSp(next, { replace: true });
  }

  function goPage(p: number) {
    const next = new URLSearchParams(sp);
    next.set('page', String(Math.max(1, p)));
    setSp(next, { replace: true });
  }

  if (isLoading) return <div className="p-6">Chargement…</div>;
  if (isError) return <div className="p-6 text-[color:var(--danger)]">{String((error as any)?.message ?? 'Erreur')}</div>;

  const items = data?.items ?? [];
  const meta = data?.meta ?? { page: 1, pageSize, total: 0 } as any;

  const fmtDate = (iso?: string | null) => {
    if (!iso) return '—';
    return String(iso).slice(0, 10);
  }

  const canCreate = ['ADMIN','DOCTOR','SECRETARY'].includes(user?.role ?? '');

  return (
    <div className="p-6 space-y-4">
      {/* Filtres */}
      <Form form={filterForm} onSubmit={() => {}} className="flex items-end gap-3 flex-wrap">
        <div className="min-w-[240px]">
          <TextField
            name="q"
            label="Recherche"
            placeholder="Nom, email, n° assurance…"
            onChange={(e: any) => apply('q', e.target.value)}
          />
        </div>
        <div className="min-w-[220px]">
          <SelectField
            name="ownerId"
            placeholder="Tous les médecins"
            label="Médecin attitré"
            options={[{ value: '', label: '— Tous —' }, ...doctorOptions] as any}
            valueType="string"
            onChange={(v: any) => apply('ownerId', v?.target?.value ?? v?.value ?? '')}
          />
        </div>
        <div className="ml-auto" />
        {canCreate && (
          <Link to="/patients/new">
            <Button>Créer un patient</Button>
          </Link>
        )}
      </Form>

      {/* Tableau */}
      <div className="overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b" style={{ borderColor: 'var(--border)' }}>
              <th className="py-2 pr-2">Nom</th>
              <th className="py-2 pr-2">Naissance</th>
              <th className="py-2 pr-2">Téléphone</th>
              <th className="py-2 pr-2">Médecin</th>
              <th className="py-2 pr-2 w-32">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map(p => {
              const full = `${p.firstName} ${p.lastName}`.trim();
              const bd = fmtDate(p.birthDate);
              const phone = p.phone || '—';
              const doc = p.doctorName || `${p.owner?.firstName ?? ''} ${p.owner?.lastName ?? ''}`.trim() || '—';
              return (
                <tr key={p.id} className="border-b last:border-b-0" style={{ borderColor: 'var(--border)' }}>
                  <td className="py-2 pr-2">{full}</td>
                  <td className="py-2 pr-2">{bd}</td>
                  <td className="py-2 pr-2">{phone}</td>
                  <td className="py-2 pr-2">{doc}</td>
                  <td className="py-2 pr-2">
                    <div className="flex gap-2">
                      <Link to={`/patients/${p.id}`}><Button size="sm" variant="outline">Voir</Button></Link>
                      <Link to={`/patients/${p.id}/edit`}><Button size="sm">Éditer</Button></Link>
                    </div>
                  </td>
                </tr>
              );
            })}
            {items.length === 0 && (
              <tr><td colSpan={5} className="py-8 text-center text-muted">Aucun résultat</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between pt-2">
        <div className="text-xs text-muted">
          Page {meta.page} • {meta.total ?? 0} patients
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" disabled={!meta.hasPreviousPage} onClick={() => goPage((meta.page ?? 1) - 1)}>Préc.</Button>
          <Button variant="outline" disabled={!meta.hasNextPage} onClick={() => goPage((meta.page ?? 1) + 1)}>Suiv.</Button>
        </div>
      </div>
    </div>
  );
}
