/* eslint-disable @typescript-eslint/no-explicit-any */
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, LogIn } from 'lucide-react';

import { useAuth } from '../../../store/auth';
import { Form } from '../../../components/widget/Form';
import { TextField } from '../../../components/widget/TextField';
import { Button } from '../../../components/ui/ButtonUI';

const schema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(1, 'Mot de passe requis'),
  remember: z.boolean().optional(),
});
type Input = z.infer<typeof schema>;

export default function LoginPage() {
  const { login } = useAuth();
  const nav = useNavigate();

  const form = useForm<Input>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: 'admin@clinic.local',
      password: 'Admin123@',
      remember: true,
    },
    mode: 'onTouched',
  });

  // Simple bandeau d’erreur global
  const err = form.formState.errors.root?.message;

  async function onSubmit(v: Input) {
    try {
      const u = await login(v.email, v.password);
      if (u.mustChangePassword) {
        nav('/change-password', { replace: true });
      } else {
        nav('/dashboard', { replace: true });
      }
    } catch (e: any) {
      const msg = e?.message || 'Identifiants invalides';
      // Erreur champ + erreur globale
      form.setError('password', { message: msg });
      form.setError('root', { message: msg });
    }
  }

  return (
    <div className="min-h-screen grid place-items-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 8, scale: 0.99 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className="card w-full max-w-sm p-6"
      >
        <div className="mb-4 flex items-center gap-2">
          <div
            className="p-2 rounded-lg text-white"
            style={{ background: 'var(--primary)' }}
          >
            <LogIn size={18} />
          </div>
          <h1 className="text-lg font-semibold">Connexion</h1>
        </div>

        {err && (
          <div
            className="mb-4 rounded-xl border px-3 py-2 text-sm"
            style={{
              borderColor: 'var(--border)',
              background: 'color-mix(in oklab, var(--danger) 12%, transparent)',
              color: 'var(--danger)',
            }}
          >
            {err}
          </div>
        )}

        <Form form={form} onSubmit={onSubmit} className="space-y-4">
          <TextField
            name="email"
            label="Email"
            placeholder="email@domaine.com"
            leftIcon={<Mail size={16} />}
            required
            autoComplete="email"
          />

          <TextField
            name="password"
            label="Mot de passe"
            type="password"
            placeholder="••••••••"
            leftIcon={<Lock size={16} />}
            required
            autoComplete="current-password"
          />

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                {...form.register('remember')}
                className="h-4 w-4 rounded border border-token text-[color:var(--primary)] focus:ring-[color:var(--primary)]"
              />
              Se souvenir de moi
            </label>
            <Link
              to="/forgot"
              className="text-xs underline hover:no-underline"
              style={{ color: 'var(--primary)' }}
            >
              Mot de passe oublié ?
            </Link>
          </div>

          <Button
            type="submit"
            className="w-full justify-center"
            loading={form.formState.isSubmitting}
            loadingText="Connexion…"
            leftIcon={<LogIn size={16} />}
          >
            Se connecter
          </Button>
        </Form>
      </motion.div>
    </div>
  );
}
