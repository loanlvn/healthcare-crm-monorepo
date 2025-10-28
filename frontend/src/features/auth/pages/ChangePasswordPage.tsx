/* eslint-disable @typescript-eslint/no-explicit-any */
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { Lock } from "lucide-react";

import { api } from "@/lib/api";
import { useAuth } from "../../../store/auth";
import { Form } from "../../../components/widget/Form";
import { TextField } from "../../../components/widget/TextField";
import { Button } from "../../../components/ui/ButtonUI";
import PasswordStrength from "@/components/widget/PasswordStrenght";

const schema = z
  .object({
    currentPassword: z.string().min(1, "Mot de passe actuel requis"),
    newPassword: z
      .string()
      .min(8, "At least 8 characters")
      .regex(/[A-Z]/, "1 uppercase letter min.")
      .regex(/[a-z]/, "1 lowercase letter min.")
      .regex(/[0-9]/, "1 number min.")
      .regex(/[^\w\s]/, "1 symbol min."),
    confirm: z.string().min(1, "Must confirm new password"),
  })
  .refine((v) => v.newPassword === v.confirm, {
    message: "Passwords do not match",
    path: ["confirm"],
  });

type Input = z.infer<typeof schema>;

export default function ChangePasswordPage() {
  const { logout, user } = useAuth();
  const nav = useNavigate();

  const form = useForm<Input>({
    resolver: zodResolver(schema),
    mode: "onTouched",
    defaultValues: { currentPassword: "", newPassword: "", confirm: "" },
  });

  const [pwScore, setPwScore] = useState(0);
  const newPw = form.watch("newPassword");

  const err = form.formState.errors.root?.message;

  async function onSubmit(v: Input) {
    try {
      await api.post("auth/change-password", {
        json: {
          currentPassword: v.currentPassword,
          newPassword: v.newPassword,
        },
      });
      // Par sécurité: logout + retour login (refresh révoqué côté backend)
      await logout();
      nav("/login", { replace: true });
    } catch (e: any) {
      let msg: string = "Faild to change password";
      try {
        const body = await e.response?.json();
        if (body?.message) msg = body.message;
        if (Array.isArray(body?.message)) msg = body.message.join("\n");
      } catch {
        // ignore
      }
      form.setError("root", { message: msg });
    }
  }

  return (
    <div className="min-h-screen grid place-items-center px-4">
      <div className="card w-full max-w-sm p-6">
        <div className="mb-4 flex items-center gap-2">
          <div
            className="p-2 rounded-lg text-white"
            style={{ background: "var(--primary)" }}
          >
            <Lock size={18} />
          </div>
          <h1 className="text-lg font-semibold">Changer mon mot de passe</h1>
        </div>

        {user?.mustChangePassword && (
          <div className="mb-4 rounded-xl border px-3 py-2 text-sm text-[color:var(--warning)]">
            Pour des raisons de sécurité, vous devez définir un nouveau mot de
            passe.
          </div>
        )}

        {err && (
          <div
            className="mb-4 rounded-xl border px-3 py-2 text-sm"
            style={{
              borderColor: "var(--border)",
              background: "color-mix(in oklab, var(--danger) 12%, transparent)",
              color: "var(--danger)",
            }}
          >
            {err}
          </div>
        )}

        <Form form={form} onSubmit={onSubmit} className="space-y-4">
          <TextField
            name="currentPassword"
            type="password"
            label="Mot de passe actuel"
            required
          />
          <div className="space-y-2">
            <TextField
              name="newPassword"
              type="password"
              label="Nouveau mot de passe"
              required
            />
            {/* <PasswordStrength /> */}
            <PasswordStrength
              value={newPw}
              emailHint={user?.email}
              onScoreChange={setPwScore}
            />
          </div>

          <TextField
            name="confirm"
            type="password"
            label="Confirmer"
            required
          />

          <Button
            type="submit"
            className="w-full justify-center"
            loading={form.formState.isSubmitting}
            loadingText="Validation…"
            disabled={pwScore < 2 || form.formState.isSubmitting}
          >
            Valider
          </Button>
        </Form>
      </div>
    </div>
  );
}
