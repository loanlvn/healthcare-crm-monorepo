/* eslint-disable @typescript-eslint/no-explicit-any */
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Lock } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";

import { api } from "@/lib/api";
import { Form } from "@/components/widget/Form";
import { TextField } from "@/components/widget/TextField";
import { Button } from "@/components/ui/ButtonUI";
import PasswordStrength from "../../../components/widget/PasswordStrenght";

const schema = z.object({
  newPassword: z.string()
    .min(8, "Min. 8 caractères")
    .regex(/[A-Z]/, "1 majuscule min.")
    .regex(/[a-z]/, "1 minuscule min.")
    .regex(/[0-9]/, "1 chiffre min.")
    .regex(/[^\w\s]/, "1 symbole min."),
  confirm: z.string().min(1, "Requis"),
}).refine((v) => v.newPassword === v.confirm, {
  message: "La confirmation ne correspond pas",
  path: ["confirm"],
});
type Input = z.infer<typeof schema>;

export default function ForgotResetPage() {
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const email = sp.get("email") ?? "";
  const token = sp.get("token") ?? "";

  const form = useForm<Input>({
    resolver: zodResolver(schema),
    defaultValues: { newPassword: "", confirm: "" },
    mode: "onTouched",
  });
  const err = form.formState.errors.root?.message;
  const [score, setScore] = useState(0);

  async function onSubmit(v: Input) {
    if (!token) {
      form.setError("root", { message: "Lien invalide. Redemande une réinitialisation." });
      return;
    }
    try {
      await api.post("auth/forgot-password/reset", {
        json: { resetToken: token, newPassword: v.newPassword },
      });
      nav("/login", { replace: true });
    } catch (e: any) {
      const msg = await safeMessage(e, "Impossible de réinitialiser le mot de passe.");
      form.setError("root", { message: msg });
    }
  }

  const newPw = form.watch("newPassword") ?? "";

  return (
    <div className="min-h-screen grid place-items-center px-4">
      <div className="card w-full max-w-sm p-6 space-y-4">
        <div className="mb-1 flex items-center gap-2">
          <div className="p-2 rounded-lg text-white" style={{ background: "var(--primary)" }}>
            <Lock size={18} />
          </div>
          <h1 className="text-lg font-semibold">Nouveau mot de passe</h1>
        </div>

        <p className="text-sm text-muted">
          Compte : <b>{email || "?"}</b>
        </p>

        {err && <AlertError message={err} />}

        <Form form={form} onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <TextField name="newPassword" type="password" label="Nouveau mot de passe" required />
            <PasswordStrength value={newPw} emailHint={email} onScoreChange={setScore} />
          </div>
          <TextField name="confirm" type="password" label="Confirmer" required />

          <Button
            type="submit"
            className="w-full justify-center"
            loading={form.formState.isSubmitting}
            loadingText="Validation…"
            disabled={score < 2 || form.formState.isSubmitting}
            title={score < 2 ? "Mot de passe trop faible" : undefined}
          >
            Valider
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
