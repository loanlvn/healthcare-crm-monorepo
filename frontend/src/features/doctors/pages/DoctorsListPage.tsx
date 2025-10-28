/* eslint-disable @typescript-eslint/no-explicit-any */
import { useSearchParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';

import { fetchDoctors, fetchDoctorSpecialties } from '../service/doctors';
import { Form } from '@/components/widget/Form';
import { TextField } from '@/components/widget/TextField';
import { SelectField } from '@/components/widget/SelectField';
import { Button } from '@/components/ui/ButtonUI';

type Filters = { q: string; specialty: string };

export default function DoctorsListPage() {
  const [sp, setSp] = useSearchParams();
  const q = sp.get('q') ?? '';
  const specialty = sp.get('specialty') ?? '';
  const page = Number(sp.get('page') ?? '1');
  const pageSize = Number(sp.get('pageSize') ?? '10');

  // --- Queries ---
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['doctors', { q, specialty, page, pageSize }],
    queryFn: () => fetchDoctors({ q, specialty, page, pageSize, orderBy: 'lastName', order: 'asc' }),
    staleTime: 10_000,
  });

  const specQuery = useQuery({
    queryKey: ['doctor.specialties'],
    queryFn: () => fetchDoctorSpecialties(),
    staleTime: 60_000,
  });

  const specs: string[] = useMemo(() => {
    const d: any = specQuery.data;
    if (Array.isArray(d)) return d;
    if (Array.isArray(d?.items)) return d.items;
    if (Array.isArray(d?.specialties)) return d.specialties;
    return [];
  }, [specQuery.data]);

  // --- Form RHF pour les filtres (fournit le FormProvider à TextField/SelectField) ---
  const filterForm = useForm<Filters>({
    defaultValues: { q, specialty },
    mode: 'onTouched',
  });

  useEffect(() => {
    filterForm.reset({ q, specialty });
  }, [q, specialty, filterForm]);

  // Helpers pour appliquer les filtres via l’URL
  function applySearch(newQ: string) {
    const next = new URLSearchParams(sp);
    if (newQ) next.set('q', newQ); else next.delete('q');
    next.set('page', '1');
    setSp(next, { replace: true });
  }
  function applySpecialty(s: string) {
    const next = new URLSearchParams(sp);
    if (s) next.set('specialty', s); else next.delete('specialty');
    next.set('page', '1');
    setSp(next, { replace: true });
  }
  function goPage(p: number) {
    const next = new URLSearchParams(sp);
    next.set('page', String(Math.max(1, p)));
    setSp(next, { replace: true });
  }

  // Soumission du formulaire de filtres
  async function onSubmit(v: Filters) {
    applySearch((v.q ?? '').trim());
    applySpecialty(v.specialty ?? '');
  }

  if (isLoading) return <div className="p-6">Chargement…</div>;
  if (isError) return <div className="p-6 text-[color:var(--danger)]">{String((error as any)?.message ?? 'Erreur')}</div>;

  const items = data?.items ?? [];
  const meta = (data?.meta ?? { page: 1, pageSize: 10, total: 0 }) as any;

  return (
    <div className="p-6 space-y-4">
      {/* Barre de filtres sous Form -> fournit le RHF context à TextField/SelectField */}
      <Form form={filterForm} onSubmit={onSubmit} className="flex items-end gap-3 flex-wrap">
        <div className="min-w-[240px]">
          <TextField
            name="q"
            label="Recherche"
            placeholder="Nom, email, bio…"
          />
        </div>

        <div className="min-w-[220px]">
          <SelectField
            name="specialty"
            label="Spécialité"
            valueType="string"
            options={[
              { value: '', label: 'Toutes' },
              ...specs.map(s => ({ value: s, label: s })),
            ]}
            placeholder="Toutes"
          />
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Button type="submit">Filtrer</Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              filterForm.reset({ q: '', specialty: '' });
              applySearch('');
              applySpecialty('');
            }}
          >
            Réinitialiser
          </Button>
          <Link to="/patients/new"><Button>Créer un patient</Button></Link>
        </div>
      </Form>

      {/* Table */}
      <div className="overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b" style={{ borderColor: 'var(--border)' }}>
              <th className="py-2 pr-2">Nom</th>
              <th className="py-2 pr-2">Email</th>
              <th className="py-2 pr-2">Spécialités</th>
              <th className="py-2 pr-2">Téléphone</th>
              <th className="py-2 pr-2 w-28">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((d: any) => {
              const full = `${d.firstName} ${d.lastName}`.trim();
              const specList = d.doctorProfile?.specialties?.join(', ') || '—';
              const phone = d.doctorProfile?.phone || '—';
              return (
                <tr key={d.id} className="border-b last:border-b-0" style={{ borderColor: 'var(--border)' }}>
                  <td className="py-2 pr-2">{full}</td>
                  <td className="py-2 pr-2">{d.email}</td>
                  <td className="py-2 pr-2">{specList}</td>
                  <td className="py-2 pr-2">{phone}</td>
                  <td className="py-2 pr-2">
                    <div className="flex gap-2">
                      <Link to={`/doctors/${d.id}`}><Button size="sm" variant="outline">Voir</Button></Link>
                      <Link to={`/doctors/${d.id}/profile`}><Button size="sm">Éditer</Button></Link>
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
          Page {meta.page} • {meta.total ?? 0} docteurs
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" disabled={!meta.hasPreviousPage} onClick={() => goPage((meta.page ?? 1) - 1)}>Préc.</Button>
          <Button variant="outline" disabled={!meta.hasNextPage} onClick={() => goPage((meta.page ?? 1) + 1)}>Suiv.</Button>
        </div>
      </div>
    </div>
  );
}
