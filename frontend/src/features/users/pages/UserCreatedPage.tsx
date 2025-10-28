/* eslint-disable @typescript-eslint/no-explicit-any */
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useNavigate, Link } from 'react-router-dom';
import { useState } from 'react';
import { UserPlus } from 'lucide-react';

import { useAuth } from '../../../store/auth';
import { createUser } from '../service/users';
import { Form, FormRow, FormSection } from '../../../components/widget/Form';
import { TextField } from '../../../components/widget/TextField';
import { SelectField } from '../../../components/widget/SelectField';
import { Button } from '../../../components/ui/ButtonUI';
import PasswordStrength from '../../../components/widget/PasswordStrenght';

const schema = z.object({
  firstName: z.string().min(1, 'Required'),
  lastName: z.string().min(1, 'Required'),
  email: z.string().email('Invalid email'),
  role: z.enum(['ADMIN','DOCTOR','SECRETARY']),
  password: z.string()
    .min(8, 'At least 8 characters')
    .regex(/[A-Z]/, 'At least one uppercase')
    .regex(/[a-z]/, 'At least one lowercase')
    .regex(/[0-9]/, 'At least one number'),
  isActive: z.boolean(),
});
type Input = z.infer<typeof schema>;

const roleOptions = [
  { value: 'ADMIN', label: 'ADMIN' },
  { value: 'DOCTOR', label: 'DOCTOR' },
  { value: 'SECRETARY', label: 'SECRETARY' },
] as const;

export default function UserCreatePage() {
  const { user: me } = useAuth();
  const isAdmin = me?.role === 'ADMIN';
  const nav = useNavigate();

  const form = useForm<Input>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '[domain]@clinic.local',
      role: 'SECRETARY',
      password: '',
      isActive: true,
    },
    mode: 'onTouched'
  });

  async function onSubmit(v: Input) {
    const created = await createUser(v);
    // backend met mustChangePassword=true automatiquement
    nav(`/users/${created.id}`, { replace: true });
  }

  const [pwScore, setPwScore] = useState(0);

  return (
    <div className="p-6 space-y-5">
      {!isAdmin && (
        <div className="p-4 rounded-md border text-[color:var(--danger)]">
          Accès refusé — réservé aux administrateurs.
        </div>
      )}

      {isAdmin && (
        <>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg text-white" style={{ background: 'var(--primary)' }}>
              <UserPlus size={18} />
            </div>
            <h1 className="text-lg font-semibold">Créer un utilisateur</h1>
            <div className="ml-auto">
              <Link to="/users"><Button variant="outline">Retour à la liste</Button></Link>
            </div>
          </div>

          <Form form={form} onSubmit={onSubmit}>
            <FormSection title="Informations" className="space-y-4">
              <FormRow label="Prénom" variant="inline" required>
                <TextField name="firstName" placeholder="Prénom" />
              </FormRow>
              <FormRow label="Nom" variant="inline" required>
                <TextField name="lastName" placeholder="Nom" />
              </FormRow>
              <FormRow label="Email" variant="inline" required>
                <TextField name="email" type="email" placeholder="email@domaine.com" />
              </FormRow>
              <FormRow label="Rôle" variant="inline" required>
                <SelectField name="role" options={roleOptions as any} valueType="string" placeholder="Sélectionner…" />
              </FormRow>
              <FormRow label="Mot de passe initial" variant="inline" required>
                <TextField name="password" type="password" placeholder="••••••••" autoComplete="new-password" />
                <PasswordStrength
                  value={form.watch('password')}
                  onScoreChange={setPwScore}
                />
              </FormRow>
            </FormSection>

            <div className="flex items-center gap-2">
              <Button 
              type="submit" 
              className="justify-center" 
              loading={form.formState.isSubmitting} 
              loadingText="Création…"
              disabled={pwScore < 2 || form.formState.isSubmitting}
              >
                Créer
              </Button>
              <Link to="/users"><Button variant="outline" type="button">Annuler</Button></Link>
            </div>
          </Form>
        </>
      )}
    </div>
  );
}
