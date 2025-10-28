/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPatient } from '../services/servicePatients';
import { Form } from '@/components/widget/Form';
import { TextField } from '@/components/widget/TextField';
import { Button } from '@/components/ui/ButtonUI';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../../store/auth';

type Input = {
  firstName: string;
  lastName: string;
  birthDate?: string;
  phone?: string;
  email?: string;
  address?: string;
  assuranceNumber?: string;
  doctorName?: string;
  notes?: string;
  ownerId?: string; // ADMIN/SECRETARY
};

export default function PatientCreatePage() {
  const { user } = useAuth();
  const role = user?.role;
  const isAdmin = role === 'ADMIN';
  const isSec = role === 'SECRETARY';
  const isDoc = role === 'DOCTOR';

  const nav = useNavigate();
  const qc = useQueryClient();

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
      ownerId: isDoc ? user?.id : '', // doc: sera ignoré de toute façon par le back, mais permet d'afficher l’info
    },
    mode: 'onTouched',
  });

  const mut = useMutation({
    mutationFn: (v: Input) => {
      const payload = {
        firstName: v.firstName,
        lastName: v.lastName,
        birthDate: v.birthDate?.trim() || '',
        phone: v.phone,
        email: v.email,
        address: v.address,
        assuranceNumber: v.assuranceNumber,
        doctorName: v.doctorName,
        notes: v.notes,
        ownerId: (isAdmin || isSec) ? (v.ownerId || '') : '', // Ensure ownerId is always a string
      };
      return createPatient(payload);
    },
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: ['patients'] });
      nav(`/patients/${created.id}`, { replace: true });
    },
    onError: async (e: any) => {
      const body = await e?.response?.json().catch(() => null);
      const msg = body?.error?.message || body?.message || 'Création impossible.';
      form.setError('root', { message: msg });
    },
  });

  const err = form.formState.errors.root?.message;

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-lg font-semibold">Créer un patient</h1>

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

        {(isAdmin || isSec) ? (
          <div className="md:col-span-2">
            <label className="text-xs block mb-1 text-muted">Owner (UUID médecin)</label>
            <input className="input w-full" {...form.register('ownerId')} placeholder="UUID médecin" />
          </div>
        ) : (
          <div className="md:col-span-2 text-xs text-muted">
            Owner: <b>{user?.firstName} {user?.lastName}</b> (imposé)
          </div>
        )}

        <div className="md:col-span-2 flex items-center gap-2">
          <Button type="submit" loading={mut.isPending} loadingText="Création…">Créer</Button>
          <Button variant="outline" type="button" onClick={() => nav(-1)}>Annuler</Button>
        </div>
      </Form>
    </div>
  );
}
