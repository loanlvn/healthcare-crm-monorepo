// src/features/users/pages/UserDetailPage.tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

import { useAuth } from '../../../store/auth';
import { fetchUserById, updateUser, disableUser } from '../service/users';
import { queryClient } from '@/lib/query';

import { Form, FormRow, FormSection } from '../../../components/widget/Form';
import { TextField } from '../../../components/widget/TextField';
import { SelectField } from '../../../components/widget/SelectField';
import { Button } from '../../../components/ui/ButtonUI';

import type { Role, UpdateUserDTO } from '@/lib/types';
import { useEffect } from 'react';

const schema = z.object({
  firstName: z.string().min(1, 'Requis'),
  lastName: z.string().min(1, 'Requis'),
  email: z.string().email('Email invalide'),
  role: z.enum(['ADMIN', 'DOCTOR', 'SECRETARY']),
  password: z.string().min(8, 'Min. 8 caractères').optional().or(z.literal('')),
});
type Input = z.infer<typeof schema>;

const roleOptions = [
  { value: 'ADMIN', label: 'ADMIN' },
  { value: 'DOCTOR', label: 'DOCTOR' },
  { value: 'SECRETARY', label: 'SECRETARY' },
] as const;

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user: me } = useAuth();
  const isAdmin = me?.role === 'ADMIN';
  const hasId = Boolean(id);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['user', id],
    queryFn: () => fetchUserById(id as string),
    enabled: isAdmin && hasId,
  });

  const form = useForm<Input>({
    resolver: zodResolver(schema),
    defaultValues:{
        firstName: '',
        lastName: '',
        email: '',
        role: 'SECRETARY',
        password: '',
    }
  });

  useEffect(() => {
    if (data) {
      form.reset({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        role: data.role,
        password: '',
      });
    }
  }, [data, form]);

  const saveMut = useMutation({
    mutationFn: (values: Input) => {
      const payload: UpdateUserDTO = {
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        role: values.role as Role,
        ...(values.password ? { password: values.password } : {}),
      };
      return updateUser(id as string, payload);
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(['user', id], updated);
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const disableMut = useMutation({
    mutationFn: () => disableUser(id as string),
    onSuccess: (updated) => {
      queryClient.setQueryData(['user', id], updated);
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  return (
    <div className="p-6 space-y-5">
      {/* Accès */}
      {!isAdmin && (
        <div className="p-4 rounded-md border text-[color:var(--danger)]">
          Accès refusé — réservé aux administrateurs.
        </div>
      )}
      {!hasId && (
        <div className="p-4 rounded-md border text-[color:var(--danger)]">
          ID manquant.
        </div>
      )}

      {/* Corps de page uniquement si admin & id */}
      {isAdmin && hasId && (
        <>
          <header className="flex items-center justify-between">
            <h1 className="text-lg font-semibold tracking-tight">
              {data ? `Utilisateur — ${data.firstName} ${data.lastName}` : 'Utilisateur'}
            </h1>
            {data && (
              <div className="text-sm text-muted">
                Créé le {new Date(data.createdAt).toLocaleString()} • Statut : {data.isActive ? 'ACTIVE' : 'DISABLED'}
              </div>
            )}
          </header>

          {isLoading ? (
            <div>Chargement…</div>
          ) : isError ? (
            <div className="text-[color:var(--danger)]">{String((error as any)?.message ?? 'Erreur')}</div>
          ) : !data ? (
            <div className="p-4 rounded-md border">Utilisateur introuvable.</div>
          ) : (
            <Form form={form} onSubmit={(values: Input) => saveMut.mutate(values)}>
              <FormSection title="Informations" className="space-y-4">
                <FormRow label="Prénom" variant="inline" required>
                  <TextField name="firstName" placeholder="Prénom" />
                </FormRow>
                <FormRow label="Nom" variant="inline" required>
                  <TextField name="lastName" placeholder="Nom" />
                </FormRow>
                <FormRow label="Email" variant="inline" required>
                  <TextField name="email" type="email" placeholder="email@domaine.com" autoComplete="email" />
                </FormRow>
                <FormRow label="Rôle" variant="inline" required>
                  <SelectField
                    name="role"
                    placeholder="Sélectionner…"
                    options={roleOptions as any}
                    valueType="string"
                  />
                </FormRow>
              </FormSection>

              <FormSection
                title="Sécurité"
                description="Changer le mot de passe de cet utilisateur (optionnel)."
                className="space-y-4"
              >
                <FormRow label="Nouveau mot de passe" variant="inline">
                  <TextField
                    name="password"
                    type="password"
                    placeholder="Laisser vide pour ne pas changer"
                    autoComplete="new-password"
                  />
                </FormRow>
              </FormSection>

              <div className="flex items-center gap-2">
                <Button type="submit" loading={saveMut.isPending} loadingText="Enregistrement…">
                  Enregistrer
                </Button>
                <Button variant="outline" type="button" onClick={() => navigate(-1)}>
                  Retour
                </Button>
                <div className="ml-auto" />
                <Button
                  variant="outline"
                  loading={disableMut.isPending}
                  disabled={!data.isActive || disableMut.isPending}
                  onClick={() => {
                    if (!confirm('Confirmer la désactivation de ce compte ?')) return;
                    disableMut.mutate();
                  }}
                >
                  {data.isActive ? 'Désactiver le compte' : 'Compte désactivé'}
                </Button>
              </div>
            </Form>
          )}
        </>
      )}
    </div>
  );
}
