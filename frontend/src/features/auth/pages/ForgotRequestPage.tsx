// src/features/auth/pages/ForgotRequestPage.tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useNavigate, Link } from "react-router-dom";
import { Mail } from "lucide-react";
import { motion } from "framer-motion";

import { api } from "@/lib/api";
import { Form } from "@/components/widget/Form";
import { TextField } from "@/components/widget/TextField";
import { Button } from "@/components/ui/ButtonUI";

const schema = z.object({
  email: z.string().email("Email invalide"),
});
type Input = z.infer<typeof schema>;

export default function ForgotRequestPage() {
  const nav = useNavigate();
  const form = useForm<Input>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
    mode: "onTouched",
  });

  async function onSubmit(v: Input) {
    try {
      await api.post("auth/forgot-password/request", { json: v });
      nav(`/forgot/verify?email=${encodeURIComponent(v.email)}`, { replace: true });
    } catch (e: any) {
      const msg = await safeMessage(e, "Impossible d'envoyer le code. Réessaie.");
      form.setError("root", { message: msg });
    }
  }

  const err = form.formState.errors.root?.message;

  return (
    <div className="min-h-screen grid place-items-center px-4">
      <div className="card w-full max-w-sm p-6 space-y-4">
        <div className="mb-1 flex items-center gap-2">
          <div className="p-2 rounded-lg text-white" style={{ background: "var(--primary)" }}>
            <Mail size={18} />
          </div>
          <h1 className="text-lg font-semibold">Mot de passe oublié</h1>
        </div>

        <p className="text-sm text-muted">
          Entre ton adresse e-mail. Nous t’enverrons un <b>code à 6 chiffres</b> pour vérifier que c’est bien toi.
        </p>

        {err && <AlertError message={err} />}

        <Form form={form} onSubmit={onSubmit} className="space-y-4">
          <TextField name="email" type="email" label="Email" required autoComplete="email" />
          <Button type="submit" className="w-full justify-center" loading={form.formState.isSubmitting} loadingText="Envoi…">
            Envoyer le code
          </Button>
        </Form>

        <div className="text-center text-xs">
          <Link to="/login" className="underline">Retour connexion</Link>
        </div>
      </div>
    </div>
  );
}

function AlertError({ message }: { message: string }) {
  return (
    <motion.div
      className="rounded-xl border px-3 py-2 text-sm"
      style={{
        borderColor: "var(--border)",
        background: "color-mix(in oklab, var(--danger) 12%, transparent)",
        color: "var(--danger)",
      }}
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {message}
    </motion.div>
  );
}

async function safeMessage(e: any, fallback: string) {
  try {
    const body = await e?.response?.json();
    if (Array.isArray(body?.issues)) return body.issues.map((i: any) => i.message).join("\n");
    if (body?.message) return body.message;
  } catch {
    // ignore
  }
  return fallback;
}
