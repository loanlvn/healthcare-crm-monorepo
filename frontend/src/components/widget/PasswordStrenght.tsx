// src/components/security/PasswordStrength.tsx
import { useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X } from "lucide-react";
import clsx from "clsx";


type Policy = {
  minLength?: number;       // défaut: 8
  strongLength?: number;     // défaut: 12
  requireUpperLower?: boolean; // défaut: true
  requireNumber?: boolean;     // défaut: true
  requireSymbol?: boolean;     // défaut: true
};
type Props = {
  value: string | null;
  emailHint?: string | null;            // pénalise si le mdp contient l'email/local-part
  className?: string;
  policy?: Policy;
  onScoreChange?: (score: number) => void; // 0..3
};

const COLORS = ["#ef4444", "#f59e0b", "#3b82f6", "#10b981"]; // red / amber / blue / green
const LABELS = ["weak", "ok", "good", "strong"] as const;
const EMOJI = ["👎", "🙂", "💪", "🛡️"];


function evaluateStrength(rawPw?: string | null, rawEmail?: string | null, policy?: Policy) {
    const pw = typeof rawPw === "string" ? rawPw : "";
    const email = typeof rawEmail === "string" ? rawEmail : "";
    const p = {
      minLength: policy?.minLength ?? 8,
      strongLength: policy?.strongLength ?? 12,
      requireUpperLower: policy?.requireUpperLower ?? true,
      requireNumber: policy?.requireNumber ?? true,
      requireSymbol: policy?.requireSymbol ?? true,
    };

  const length = pw.length;
  const hasLower = /[a-z]/.test(pw);
  const hasUpper = /[A-Z]/.test(pw);
  const hasNumber = /\d/.test(pw);
  const hasSymbol = /[^A-Za-z0-9]/.test(pw);

  const repeated = /(.)\1{2,}/.test(pw); // ex: aaa, 111
  const sequences = /(0123|1234|2345|abcd|qwerty)/i.test(pw);
  const common = /(password|pass|letmein|admin|welcome)/i.test(pw);

  let emailPart = "";
  if (email) {
    const at = email.indexOf("@");
    emailPart = at > 0 ? email.slice(0, at) : email;
  }
  const containsEmail = !!emailPart && emailPart.length >= 3 && pw.toLowerCase().includes(emailPart.toLowerCase());

  // score brut : diversité + longueur
  let raw = 0;
  if (length >= p.minLength) raw += 1;
  if (length >= p.strongLength) raw += 1;
  if (hasLower && hasUpper) raw += 1;
  if (hasNumber) raw += 1;
  if (hasSymbol) raw += 1;

  // pénalités
  if (repeated) raw -= 1;
  if (sequences) raw -= 1;
  if (common) raw -= 2;
  if (containsEmail) raw -= 2;

  // clamp & normalisation sur 0..3
  raw = Math.max(0, Math.min(raw, 5));
  const score = Math.min(3, Math.floor((raw / 5) * 3)); // 0..3

  const label = LABELS[score];

  // critères visuels (cochent en live)
  const checks = [
    { ok: length >= p.minLength, text: `≥ ${p.minLength} character` },
    p.requireUpperLower
      ? { ok: hasLower && hasUpper, text: "lowercase + uppercase" }
      : null,
    p.requireNumber ? { ok: hasNumber, text: "a number" } : null,
    p.requireSymbol ? { ok: hasSymbol, text: "a symbol" } : null,
    { ok: length >= p.strongLength, text: `≥ ${p.strongLength} character (strong)` },
  ].filter(Boolean) as { ok: boolean; text: string }[];

  // suggestions (texte)
  const suggestions: string[] = [];
  if (containsEmail) suggestions.push("Try to not include your email or its prefix.");
  if (repeated) suggestions.push("Avoid repeated characters (ex: aaa, 111).");
  if (sequences) suggestions.push("Avoid obvious sequences (1234, qwerty…).");
  if (!hasUpper || !hasLower) suggestions.push("Mix uppercase and lowercase letters.");
  if (!hasNumber) suggestions.push("Add at least one number.");
  if (!hasSymbol) suggestions.push("Add a symbol.");
  if (length < p.strongLength) suggestions.push(`Extend the password (≥ ${p.strongLength}).`);

  // estimation entropie (grossière) pour l'affichage informatif
  let charset = 0;
  if (hasLower) charset += 26;
  if (hasUpper) charset += 26;
  if (hasNumber) charset += 10;
  if (hasSymbol) charset += 33; // approx ASCII punct
  const entropy = charset > 0 ? Math.round(length * Math.log2(charset)) : 0;

  return { score, label, checks, suggestions, entropy };
}

export default function PasswordStrength({ value, emailHint, className, policy, onScoreChange }: Props) {
  const { score, label, checks, suggestions, entropy } = useMemo(
    () => evaluateStrength(value, emailHint, policy),
    [value, emailHint, policy]
  );

  useEffect(() => {
    onScoreChange?.(score);
  }, [score, onScoreChange]);

  const color = COLORS[score];
  const percent = [0, 33, 66, 100][score];

  const shake = {
    x: [0, -4, 4, -2, 2, 0],
    transition: { duration: 0.35 },
  };

  return (
    <div className={clsx("mt-2 space-y-2", className)}>
      {/* Barre animée principale */}
      <div className="relative">
        <div className="h-2 w-full rounded bg-black/10 overflow-hidden">
          <motion.div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
            initial={{ width: 0 }}
            animate={{ width: `${percent}%`, backgroundColor: color }}
            transition={{ type: "spring", stiffness: 140, damping: 20 }}
            className="h-2"
          />
        </div>

        {/* Segments qui "pop" */}
        <div className="absolute inset-0 flex gap-1 pointer-events-none px-[2px]">
          {[0, 1, 2, 3].map((i) => (
            <motion.div
              key={i}
              initial={{ scaleY: 0.6, opacity: 0.25 }}
              animate={{
                scaleY: i <= score ? 1 : 0.8,
                opacity: i <= score ? 1 : 0.35,
              }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
              className="flex-1"
            />
          ))}
        </div>
      </div>

      {/* Libellé + emoji qui pulse / shake */}
      <motion.div
        className="text-xs flex items-center gap-2"
        animate={score === 0 && value ? shake : { scale: [1, 1.03, 1] }}
        transition={{ duration: 0.6 }}
      >
        <span className="inline-flex items-center gap-1">
          <motion.span
            key={label}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 220, damping: 20 }}
            className="font-medium"
            style={{ color }}
          >
            {EMOJI[score]} security : {label}
          </motion.span>
          <motion.span
            className="text-[11px] text-muted"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.05 }}
          >
            (~{entropy} bits)
          </motion.span>
        </span>
      </motion.div>

      {/* Checklist dynamique des critères */}
      <ul className="text-xs grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
        {checks.map((c) => (
          <li key={c.text} className="inline-flex items-center gap-2">
            <motion.span
              initial={{ scale: 0.8, opacity: 0.5 }}
              animate={{ scale: c.ok ? 1 : 0.95, opacity: c.ok ? 1 : 0.6 }}
              className={clsx(
                "inline-flex h-4 w-4 rounded-full items-center justify-center",
                c.ok ? "bg-green-500/15 text-green-600" : "bg-black/10 text-gray-500"
              )}
            >
              {c.ok ? <Check size={12} /> : <X size={12} />}
            </motion.span>
            <span className={clsx(c.ok ? "text-foreground" : "text-muted")}>{c.text}</span>
          </li>
        ))}
      </ul>

      {/* Suggestions (affichées quand il y a des choses à améliorer) */}
      <AnimatePresence initial={false}>
        {value && suggestions.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0, y: -4 }}
            animate={{ height: "auto", opacity: 1, y: 0 }}
            exit={{ height: 0, opacity: 0, y: -4 }}
            className="rounded-md border px-3 py-2 text-[11px]"
          >
            <div className="mb-1 font-medium">Suggestions :</div>
            <ul className="list-disc pl-4 space-y-0.5">
              {suggestions.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
