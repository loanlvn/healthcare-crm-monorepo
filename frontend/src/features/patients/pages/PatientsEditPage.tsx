/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchPatientById, updatePatient } from '../services/servicePatients';
import { Form } from '@/components/widget/Form';
import { TextField } from '@/components/widget/TextField';
import { Button } from '@/components/ui/ButtonUI';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../../store/auth';

type Input = {
  firstName: string;
  lastName: string;
  birthDate?: string; // YYYY-MM-DD
  phone?: string;
  email?: string;
  address?: string;
  assuranceNumber?: string;
  doctorName?: string;
  notes?: string;
  ownerId?: string; // admin/secretary seulement
};

export default function PatientEditPage() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();
  const role = user?.role;
  const isAdmin = role === 'ADMIN';
  const isSec = role === 'SECRETARY';

  const q = useQuery({
    queryKey: ['patient', id],
    queryFn: () => fetchPatientById(id!),
    enabled: Boolean(id),
  });

  const form = useForm<Input>({
    defaultValues: {
      firstName: '',
      lastName: '',
      birthDate: '',
      phone: '',
      email: '',
      address: '',
      assuranceNumber: '',
      doctorName: '',
      notes: '',
      ownerId: '',
    },
    mode: 'onTouched',
  });

  // Pré-remplir quand la data arrive
  useEffect(() => {
    const p = q.data;
    if (!p) return;
    form.reset({
      firstName: p.firstName ?? '',
      lastName: p.lastName ?? '',
      birthDate: p.birthDate ? p.birthDate.slice(0, 10) : '',
      phone: p.phone ?? '',
      email: p.email ?? '',
      address: p.address ?? '',
      assuranceNumber: p.assuranceNumber ?? '',
      doctorName: p.doctorName ?? '',
      notes: p.notes ?? '',
      ownerId: (isAdmin || isSec) ? (p.ownerId ?? '') : '', // DOCTOR ne touche pas à ownerId
    });
  }, [q.data]);

  const mut = useMutation({
    mutationFn: (v: Input) => {
      const payload: Input = {
        firstName: v.firstName,
        lastName: v.lastName,
        birthDate: v.birthDate?.trim() || '', // '' -> backend = undefined
        phone: v.phone,
        email: v.email,
        address: v.address,
        assuranceNumber: v.assuranceNumber,
        doctorName: v.doctorName,
        notes: v.notes,
        ...(isAdmin || isSec ? { ownerId: v.ownerId } : {}),
      };
      return updatePatient(id!, payload);
    },
    onSuccess: (updated) => {
      qc.setQueryData(['patient', id], updated);
      qc.invalidateQueries({ queryKey: ['patients'] });
      nav(`/patients/${id}`, { replace: true });
    },
    onError: async (e: any) => {
      const body = await e?.response?.json().catch(() => null);
      const msg = body?.error?.message || body?.message || 'Échec de la sauvegarde.';
      form.setError('root', { message: msg });
    }
  });

  if (!id) return <div className="p-6 text-[color:var(--danger)]">ID manquant.</div>;
  if (q.isLoading) return <div className="p-6">Chargement…</div>;
  if (q.isError) return <div className="p-6 text-[color:var(--danger)]">{String((q.error as any)?.message ?? 'Erreur')}</div>;
  if (!q.data) return <div className="p-6">Patient introuvable.</div>;

  const err = form.formState.errors.root?.message;

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-lg font-semibold">Éditer le patient</h1>

      {err && (
        <div className="mb-2 rounded-xl border px-3 py-2 text-sm"
             style={{ borderColor: 'var(--border)', background: 'color-mix(in oklab, var(--danger) 12%, transparent)', color: 'var(--danger)' }}>
          {err}
        </div>
      )}

      <Form form={form} onSubmit={(v) => mut.mutate(v)} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TextField name="firstName" label="Prénom" required />
        <TextField name="lastName" label="Nom" required />
        <TextField name="birthDate" label="Naissance" type="date" />
        <TextField name="phone" label="Téléphone" />
        <TextField name="email" label="Email" type="email" />
        <TextField name="address" label="Adresse" />
        <TextField name="assuranceNumber" label="N° assurance" />
        <TextField name="doctorName" label="Médecin (affichage)" />
        <TextField name="notes" label="Notes" />

        {(isAdmin || isSec) && (
          <div className="md:col-span-2">
            <label className="text-xs block mb-1 text-muted">Owner (UUID médecin)</label>
            <input className="input w-full" {...form.register('ownerId')} placeholder="UUID médecin" />
          </div>
        )}

        <div className="md:col-span-2 flex items-center gap-2">
          <Button type="submit" loading={mut.isPending} loadingText="Enregistrement…">Enregistrer</Button>
          <Button variant="outline" type="button" onClick={() => nav(-1)}>Annuler</Button>
        </div>
      </Form>
    </div>
  );
}
