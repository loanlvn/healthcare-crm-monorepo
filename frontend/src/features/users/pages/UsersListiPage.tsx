/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, keepPreviousData } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';

import { useAuth } from '../../../store/auth';
import { queryClient } from '@/lib/query';

import { Button } from '../../../components/ui/ButtonUI';
import { Form, FormRow } from '../../../components/widget/Form';
import { TextField } from '../../../components/widget/TextField';

import { fetchUsers, disableUser, fetchUserById } from '../service/users';
import type { User } from '@/lib/types';

type Filters = { q: string };

export default function UsersListPage() {
  const { user: me } = useAuth();
  const isAdmin = me?.role === 'ADMIN';

  const [sp, setSp] = useSearchParams();
  const page = Number(sp.get('page') ?? 1);
  const limit = Number(sp.get('limit') ?? 10);
  const q = sp.get('q') ?? '';

  const { data, isLoading, isError, error, isFetching } = useQuery({
    queryKey: ['users', { page, limit, q }],
    queryFn: () => fetchUsers({ page, limit, q }),
    enabled: isAdmin,
    placeholderData: keepPreviousData,
  });

  const disableMut = useMutation({
    mutationFn: (id: string) => disableUser(id),
    onSuccess: (updatedUser: User) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.setQueryData(['user', updatedUser.id], updatedUser);
    },
  });

  const totalPages = useMemo(() => {
    if (!data) return 1;
    return Math.max(1, Math.ceil(data.total / data.limit));
  }, [data]);

  function setPage(p: number) {
    const next = new URLSearchParams(sp);
    next.set('page', String(p));
    next.set('limit', String(limit));
    if (q) next.set('q', q); else next.delete('q');
    setSp(next, { replace: true });
  }

  function onSearch(values: Filters) {
    const next = new URLSearchParams(sp);
    if (values.q) next.set('q', values.q); else next.delete('q');
    next.set('page', '1');
    next.set('limit', String(limit));
    setSp(next);
  }

  // Prefetch du détail au survol pour ouvrir la page plus vite
  function prefetchUser(id: string) {
    queryClient.prefetchQuery({
      queryKey: ['user', id],
      queryFn: () => fetchUserById(id),
    }).catch(() => void 0);
  }

  return (
    <div className="p-6 space-y-5">
      <header className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Utilisateurs</h1>
        {isAdmin && (
          <Link to="/users/new">
            <Button aria-label="Créer un utilisateur">Créer</Button>
          </Link>
        )}
      </header>

      {!isAdmin && (
        <div className="p-4 rounded-md border text-[color:var(--danger)]">
          Accès refusé — réservé aux administrateurs.
        </div>
      )}

      {/* Barre de recherche */}
      <SearchBar defaultQ={q} onSubmit={onSearch} />

      {/* Contenu */}
      {isAdmin && (
        <>
          {isLoading ? (
            <div>Chargement…</div>
          ) : isError ? (
            <div className="text-[color:var(--danger)]">
              {String((error as any)?.message ?? 'Erreur')}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto border rounded-xl">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left p-3">Name</th>
                      <th className="text-left p-3">Email</th>
                      <th className="text-left p-3">Role</th>
                      <th className="text-left p-3">Status</th>
                      <th className="text-right p-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data?.items ?? []).map((u: User) => (
                      <tr key={u.id} className="border-t">
                        <td className="p-3">{u.firstName} {u.lastName}</td>
                        <td className="p-3">{u.email}</td>
                        <td className="p-3">{u.role}</td>
                        <td className="p-3">
                          {u.isActive ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-50 text-green-700">
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-100 text-gray-600">
                              Désactivé
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          <div className="flex justify-end gap-2">
                            <Link
                              to={`/users/${u.id}`}
                              onMouseEnter={() => prefetchUser(u.id)}
                            >
                              <Button variant="outline">Voir / Éditer</Button>
                            </Link>
                            <Button
                              variant="outline"
                              loading={disableMut.isPending}
                              disabled={!u.isActive || disableMut.isPending}
                              onClick={async () => {
                                if (!confirm(`Désactiver le compte de ${u.firstName} ${u.lastName} ?`)) return;
                                await disableMut.mutateAsync(u.id);
                              }}
                            >
                              {u.isActive ? 'Désactiver' : 'Déjà désactivé'}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}

                    {data && data.items.length === 0 && (
                      <tr>
                        <td className="p-8 text-center text-muted" colSpan={5}>
                          <div className="flex items-center justify-center gap-3">
                            <span>Aucun utilisateur.</span>
                            <Link to="/users/new">
                              <Button aria-label="Créer un utilisateur">Create an user</Button>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted">
                  Page {data?.page ?? 1} / {totalPages} {isFetching && '…'}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                    Précédent
                  </Button>
                  <Button variant="outline" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                    Suivant
                  </Button>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

function SearchBar({ defaultQ, onSubmit }: { defaultQ: string; onSubmit: (v: Filters) => void }) {
  const form = useForm<Filters>({ defaultValues: { q: defaultQ ?? '' } });

  return (
    <Form form={form} onSubmit={(values) => onSubmit(values)}>
      <FormRow label="Recherche" variant="inline">
        <div className="flex gap-2">
          <TextField name="q" placeholder="nom, email…" />
          <Button type="submit">Filtrer</Button>
          {defaultQ && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                form.reset({ q: '' });
                onSubmit({ q: '' });
              }}
            >
              Effacer
            </Button>
          )}
        </div>
      </FormRow>
    </Form>
  );
}
