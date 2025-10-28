/* eslint-disable react-hooks/rules-of-hooks */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo, useRef, useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { ShieldCheck, RotateCcw } from "lucide-react";
import { motion } from "framer-motion";

import { api } from "@/lib/api";
import { Button } from "@/components/ui/ButtonUI";


export default function ForgotVerifyPage() {
  const [sp] = useSearchParams();
  const email = sp.get("email") ?? "";
  const nav = useNavigate();

  const [digits, setDigits] = useState(Array(6).fill(""));
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // cooldown pour renvoi
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    let id: any;
    if (cooldown > 0) id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  const code = useMemo(() => digits.join(""), [digits]);

  const inputs = Array.from({ length: 6 }, () => useRef<HTMLInputElement | null>(null));
  const setInputRef = (i: number) => (el: HTMLInputElement | null) => { inputs[i].current = el; };

  function onChange(i: number, v: string) {
    if (!/^\d?$/.test(v)) return;
    const next = digits.slice();
    next[i] = v;
    setDigits(next);
    setErr(null);
    if (v && i < 5) inputs[i + 1].current?.focus();
  }
  function onKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      inputs[i - 1].current?.focus();
    }
  }

  async function submit() {
    if (!email) return setErr("Email manquant.");
    if (code.length !== 6) return setErr("Code incomplet.");
    try {
      setSubmitting(true);
      const { resetToken } = await api.post("auth/forgot-password/verify", {
        json: { email, code },
      }).json< { resetToken: string }>();
      nav(`/forgot/reset?email=${encodeURIComponent(email)}&token=${encodeURIComponent(resetToken)}`, { replace: true });
    } catch (e: any) {
      const msg = await safeMessage(e, "Code invalide ou expiré.");
      setErr(msg);
    } finally {
      setSubmitting(false);
    }
  }

  async function resend() {
    try {
      if (!email) return setErr("Email manquant.");
      await api.post("auth/forgot-password/request", { json: { email } });
      setCooldown(30); // 30s anti-spam
    } catch (e: any) {
      const msg = await safeMessage(e, "Échec de renvoi du code.");
      setErr(msg);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center px-4">
      <div className="card w-full max-w-sm p-6 space-y-4">
        <div className="mb-1 flex items-center gap-2">
          <div className="p-2 rounded-lg text-white" style={{ background: "var(--primary)" }}>
            <ShieldCheck size={18} />
          </div>
          <h1 className="text-lg font-semibold">Vérifie ton code</h1>
        </div>

        <p className="text-sm text-muted">
          Un code à 6 chiffres a été envoyé à <b>{email || "?"}</b>.
        </p>

        {err && <AlertError message={err} />}

        {/* OTP 6 cases avec motion */}
        <div className="flex gap-2 justify-center pt-1">
          {digits.map((d, i) => (
            <motion.input
              key={i}
              ref={setInputRef(i)}
              inputMode="numeric"
              pattern="\d*"
              maxLength={1}
              value={d}
              onChange={(e) => onChange(i, e.target.value)}
              onKeyDown={(e) => onKeyDown(i, e)}
              className="w-10 h-12 text-center text-lg rounded-lg border outline-none focus:ring-2"
              initial={{ scale: 0.9, opacity: 0.6 }}
              animate={{ scale: d ? 1.02 : 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 240, damping: 16 }}
            />
          ))}
        </div>

        <div className="flex items-center justify-between pt-1">
          <Button
            type="button"
            variant="outline"
            onClick={resend}
            disabled={cooldown > 0}
            leftIcon={<RotateCcw size={14} />}
            title={cooldown > 0 ? `Réessayer dans ${cooldown}s` : "Renvoyer le code"}
          >
            {cooldown > 0 ? `Renvoyer (${cooldown}s)` : "Renvoyer le code"}
          </Button>

          <Button onClick={submit} loading={submitting} loadingText="Vérification…">
            Continuer
          </Button>
        </div>

        <div className="text-center text-xs">
          <Link to="/forgot" className="underline">Changer d’e-mail</Link>
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
