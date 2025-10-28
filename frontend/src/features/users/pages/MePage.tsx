/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  Shield,
  Mail,
  BadgeCheck,
  AlertCircle,
  Lock,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import { api } from "@/lib/api";
import { queryClient } from "@/lib/query";
import { useAuth } from "@/store/auth";
import { uploadMyAvatar } from "@/features/users/service/users";

import { Form, FormSection, FormRow } from "@/components/widget/Form";
import { TextField } from "@/components/widget/TextField";
import { Button } from "@/components/ui/ButtonUI";
import PasswordStrength from "@/components/widget/PasswordStrenght";
import {
  fetchDoctorById,
  updateDoctorProfile,
} from "@/features/doctors/service/doctors";

import Avatar from "@/components/widget/Avatar";

/* =================== Schemas =================== */
const profileSchema = z.object({
  firstName: z.string().min(1, "Requis"),
  lastName: z.string().min(1, "Requis"),
  email: z.string().email("Email invalide"),
});
type ProfileInput = z.infer<typeof profileSchema>;

// même politique que le backend
const changePwdSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password required"),
    newPassword: z
      .string()
      .min(8, "At least 8 characters")
      .refine((s) => /[A-Z]/.test(s), "Must contain an uppercase letter")
      .refine((s) => /[a-z]/.test(s), "Must contain a lowercase letter")
      .refine((s) => /[0-9]/.test(s), "Must contain a number"),
    confirmNewPassword: z.string().min(1, "Confirmation required"),
  })
  .refine((v) => v.newPassword === v.confirmNewPassword, {
    path: ["confirmNewPassword"],
    message: "Passwords do not match",
  });
type ChangePwdInput = z.infer<typeof changePwdSchema>;

const doctorProfileSchema = z.object({
  phone: z.string().max(40).nullable().or(z.literal("")).optional(),
  specialties: z.string().max(1000).optional(),
  bio: z.string().max(500).nullable().or(z.literal("")).optional(),
});
type DoctorProfileInput = z.infer<typeof doctorProfileSchema>;

/* =================== Types =================== */
type Me = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "ADMIN" | "DOCTOR" | "SECRETARY";
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
  avatarUrl?: string | null;
};

const MAX_BYTES = 1 * 1024 * 1024; // 1MB
const ALLOWED = ["image/png", "image/jpeg", "image/webp"];

export default function MePage() {
  const { user, setUser, logout } = useAuth();
  const [editMode, setEditMode] = useState(false);
  const [pwdOpen, setPwdOpen] = useState(false);
  const [pwScore, setPwScore] = useState(0);
  const nav = useNavigate();

  /* ---------- Me ---------- */
  const {
    data: me,
    isLoading,
    error,
  } = useQuery<Me>({
    queryKey: ["me"],
    queryFn: () => api.get("users/me").json(),
  });

  const form = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    values: me
      ? { firstName: me.firstName, lastName: me.lastName, email: me.email }
      : { firstName: "", lastName: "", email: "" },
    mode: "onTouched",
  });

  const mUpdate = useMutation({
    mutationFn: async (payload: ProfileInput) =>
      api.put(`users/${me!.id}`, { json: payload }).json<Me>(),
    onSuccess: (updated) => {
      queryClient.setQueryData(["me"], updated);
      setUser({
        ...(user as any),
        firstName: updated.firstName,
        lastName: updated.lastName,
        email: updated.email,
      });
      setEditMode(false);
    },
  });

  const isDoctor = me?.role === "DOCTOR";

  const docQ = useQuery({
    queryKey: ["doctor", me?.id],
    queryFn: () => fetchDoctorById(me?.id as string),
    enabled: Boolean(isDoctor && me?.id),
    staleTime: 30_000,
  });

  const formDoctor = useForm<DoctorProfileInput>({
    resolver: zodResolver(doctorProfileSchema),
    values: docQ.data
      ? {
          phone: docQ.data.doctorProfile?.phone ?? "",
          bio: docQ.data.doctorProfile?.bio ?? "",
          specialties: (docQ.data.doctorProfile?.specialties ?? []).join(", "),
        }
      : undefined,
    mode: "onTouched",
  });

  const [saved, setSaved] = useState(false); // feedback « profil enregistré »

  const mUpdateDoctor = useMutation({
    mutationFn: async (v: DoctorProfileInput) => {
      const specialties = (v.specialties ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      return updateDoctorProfile(me!.id, {
        phone: v.phone ? String(v.phone) : null,
        bio: v.bio ? String(v.bio) : null,
        specialties,
      });
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["doctors"] });
      queryClient.invalidateQueries({ queryKey: ["me"] });
      queryClient.invalidateQueries({ queryKey: ["doctor", updated?.id] });

      formDoctor.reset({
        phone: updated.doctorProfile?.phone ?? "",
        bio: updated.doctorProfile?.bio ?? "",
        specialties: (updated.doctorProfile?.specialties ?? []).join(", "),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    },
    onError: (e: any) => {
      const msg = e?.message || "Error updating and saving doctor profile";
      formDoctor.setError("root", { message: msg });
    },
  });

  /* ---------- Avatar ---------- */
  const [avatarErr, setAvatarErr] = useState<string | null>(null);
  const mUpload = useMutation({
    mutationFn: async (file: File) => {
      if (!ALLOWED.includes(file.type))
        throw new Error("Formats acceptés: PNG, JPEG, WEBP");
      if (file.size > MAX_BYTES)
        throw new Error("La photo ne doit pas dépasser 1 Mo");
      return uploadMyAvatar(file); // fetch dédié + refresh token géré
    },
    onMutate: () => setAvatarErr(null),
    onSuccess: (out) => {
      const now = new Date().toISOString();
      queryClient.setQueryData<Me>(["me"], (prev) =>
        prev ? { ...prev, avatarUrl: out.avatarUrl, updatedAt: now } : prev
      );
      setUser((prev: any) =>
        prev ? { ...prev, avatarUrl: out.avatarUrl, updatedAt: now } : prev
      );
    },
    onError: (e: any) => setAvatarErr(e?.message || "Échec de l’upload"),
  });

  const [file, setFile] = useState<File | null>(null);
  const preview = useMemo(
    () => (file ? URL.createObjectURL(file) : null),
    [file]
  );
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview]
  );

  /* ---------- Change Password ---------- */
  const formPwd = useForm<ChangePwdInput>({
    resolver: zodResolver(changePwdSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmNewPassword: "",
    },
    mode: "onTouched",
  });

  const mChangePwd = useMutation({
    mutationFn: async (payload: ChangePwdInput) => {
      const body = {
        currentPassword: payload.currentPassword,
        newPassword: payload.newPassword,
      };
      await api.post("auth/change-password", { json: body });
    },
    onSuccess: async () => {
      await logout();
      nav("/login", { replace: true });
    },
    onError: (e: any) => {
      const msg = e?.message || "Cannot change password";
      formPwd.setError("currentPassword", { message: msg });
    },
  });

  /* ---------- UI ---------- */
  if (isLoading)
    return <div className="p-6 text-sm text-muted">Chargement du profil…</div>;
  if (error || !me)
    return (
      <div className="p-6 text-sm text-[color:var(--danger)]">
        Impossible de charger le profil.
      </div>
    );

  // URL absolue pour servir les assets depuis :4000
  const ASSETS = import.meta.env.VITE_ASSETS_URL || "http://localhost:4000";

  // Calcule la source finale de l'avatar (preview local > chemin API)
  const avatarPath = me.avatarUrl || undefined; // "/uploads/avatars/xxx.webp"
  const version = me.updatedAt || me.createdAt || ""; // cache-buster
  const avatarSrc = preview || (avatarPath ? avatarPath : undefined);

  return (
    <>
      <div className="grid gap-6 md:grid-cols-[320px_1fr]">
        {/* Col gauche */}
        <aside className="card p-4 md:p-5 space-y-4">
          <Avatar
            src={avatarSrc}
            baseUrl={ASSETS} // rend absolu si src commence par "/"
            bust={version}   // ajoute ?v=...
            initials={`${me.firstName?.[0] ?? ""}${me.lastName?.[0] ?? ""}`}
            size={64}
            rounded="2xl"
            withBorder
            editable
            uploading={mUpload.isPending}
            onPick={(f) => {
              setFile(f);
              mUpload.mutate(f);
            }}
            hint="PNG, JPEG ou WEBP. Taille max : 1 Mo. Recadrée 512×512."
          />

          <div className="space-y-1">
            <div className="text-lg font-semibold">
              {me.firstName} {me.lastName}
            </div>
            <div className="text-sm text-muted flex items-center gap-1.5">
              <Mail size={14} />
              <span>{me.email}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <RoleBadge role={me.role} />
            {me.isActive ? (
              <span className="badge">Actif</span>
            ) : (
              <span className="badge" style={{ color: "var(--danger)" }}>
                Désactivé
              </span>
            )}
          </div>

          <div className="text-xs text-muted">
            <div>Créé le {new Date(me.createdAt).toLocaleString()}</div>
            {me.updatedAt && (
              <div>Maj le {new Date(me.updatedAt).toLocaleString()}</div>
            )}
          </div>

          {/* CTA change password — OUVRE LE MODAL */}
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-center"
            onClick={() => setPwdOpen(true)}
            leftIcon={<BadgeCheck size={14} />}
          >
            Changer mon mot de passe
          </Button>
        </aside>

        {/* Col droite */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Informations du compte</h2>
            {editMode ? (
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  onClick={() => {
                    form.reset();
                    setEditMode(false);
                  }}
                >
                  Annuler
                </Button>
                <Button
                  onClick={form.handleSubmit((v) => mUpdate.mutate(v))}
                  loading={mUpdate.isPending}
                  loadingText="Enregistrement…"
                >
                  Enregistrer
                </Button>
              </div>
            ) : (
              <Button variant="outline" onClick={() => setEditMode(true)}>
                Modifier
              </Button>
            )}
          </div>

          <FormSection className="p-0">
            {!editMode ? (
              <div className="p-4 md:p-5 grid gap-4 md:grid-cols-2">
                <ReadRow label="Prénom" value={me.firstName} />
                <ReadRow label="Nom" value={me.lastName} />
                <ReadRow label="Email" value={me.email} />
                <ReadRow label="Rôle" value={labelRole(me.role)} />
              </div>
            ) : (
              <Form
                form={form}
                onSubmit={(v) => mUpdate.mutate(v)}
                className="p-4 md:p-5"
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <FormRow label="Prénom" required>
                    <TextField name="firstName" placeholder="Prénom" />
                  </FormRow>
                  <FormRow label="Nom" required>
                    <TextField name="lastName" placeholder="Nom" />
                  </FormRow>
                  <FormRow label="Email" required>
                    <TextField name="email" placeholder="email@domaine.com" />
                  </FormRow>
                  <FormRow label="Rôle">
                    <div className="input pointer-events-none select-none opacity-70">
                      {labelRole(me.role)}
                    </div>
                  </FormRow>
                </div>

                <div className="mt-4 flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    type="button"
                    onClick={() => {
                      form.reset();
                      setEditMode(false);
                    }}
                  >
                    Annuler
                  </Button>
                  <Button
                    type="submit"
                    loading={mUpdate.isPending}
                    loadingText="Enregistrement…"
                  >
                    Enregistrer
                  </Button>
                </div>
              </Form>
            )}
          </FormSection>
        </section>
      </div>

      {/* -------- Profil médecin (visible seulement pour les DOCTOR) -------- */}
      {isDoctor && (
        <section className="space-y-3 mt-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Profil médecin</h2>
            <div className="text-xs text-muted">
              {docQ.isLoading ? "Chargement…" : null}
              {docQ.isError ? (
                <span className="text-[color:var(--danger)]">
                  Erreur de chargement
                </span>
              ) : null}
            </div>
          </div>

          <Form
            form={formDoctor}
            onSubmit={(v) => mUpdateDoctor.mutate(v)}
            className="card p-4 md:p-5 space-y-4"
          >
            <FormRow label="Téléphone">
              <TextField name="phone" placeholder="+351 91 000 00 00" />
            </FormRow>
            <FormRow label="Bio">
              <TextField
                name="bio"
                placeholder="Présentation, expertise, langues…"
              />
            </FormRow>
            <FormRow label="Spécialités">
              <TextField
                name="specialties"
                placeholder="Ex: Cardiologie, Dermatologie"
                helper="Séparez les spécialités par des virgules."
              />
            </FormRow>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => formDoctor.reset()}
                disabled={mUpdateDoctor.isPending}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                loading={mUpdateDoctor.isPending}
                loadingText="Enregistrement…"
              >
                Enregistrer
              </Button>
            </div>
            {formDoctor.formState.errors.root?.message && (
              <div
                className="rounded-xl border px-3 py-2 text-sm"
                style={{
                  borderColor: "var(--border)",
                  background:
                    "color-mix(in oklab, var(--danger) 12%, transparent)",
                  color: "var(--danger)",
                }}
              >
                {formDoctor.formState.errors.root?.message}
              </div>
            )}

            {saved && (
              <div
                className="rounded-xl border px-3 py-2 text-sm"
                style={{
                  borderColor: "var(--border)",
                  background:
                    "color-mix(in oklab, var(--success) 12%, transparent)",
                  color: "var(--success)",
                }}
              >
                Profil mis à jour ✅
              </div>
            )}
          </Form>
        </section>
      )}

      {/* -------- Modal Change Password -------- */}
      {pwdOpen && (
        <div className="modal-overlay" onClick={() => setPwdOpen(false)}>
          <div
            className="modal max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center gap-2">
              <div
                className="p-2 rounded-lg text-white"
                style={{ background: "var(--primary)" }}
              >
                <Lock size={16} />
              </div>
              <h3 className="text-base font-semibold">
                Changer mon mot de passe
              </h3>
            </div>

            <Form
              form={formPwd}
              onSubmit={(v) => mChangePwd.mutate(v)}
              className="space-y-3"
            >
              <FormRow label="Mot de passe actuel" required>
                <TextField
                  name="currentPassword"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </FormRow>
              <FormRow label="Nouveau mot de passe" required>
                <TextField
                  name="newPassword"
                  type="password"
                  placeholder="Au moins 8 caractères"
                  autoComplete="new-password"
                />
                <PasswordStrength
                  value={formPwd.watch("newPassword")}
                  emailHint={user?.email}
                  onScoreChange={setPwScore}
                />
              </FormRow>
              <FormRow label="Confirmer le nouveau" required>
                <TextField
                  name="confirmNewPassword"
                  type="password"
                  placeholder="Répéter le mot de passe"
                  autoComplete="new-password"
                />
              </FormRow>

              {formPwd.formState.errors.root?.message && (
                <div
                  className="flex items-center gap-2 rounded-xl border px-3 py-2 text-sm"
                  style={{
                    borderColor: "var(--border)",
                    background:
                      "color-mix(in oklab, var(--danger) 12%, transparent)",
                    color: "var(--danger)",
                  }}
                >
                  <AlertCircle size={16} />
                  <span>{formPwd.formState.errors.root?.message}</span>
                </div>
              )}

              <div className="mt-2 flex justify-end gap-2">
                <Button
                  variant="ghost"
                  type="button"
                  onClick={() => setPwdOpen(false)}
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  loading={mChangePwd.isPending}
                  loadingText="Mise à jour…"
                  disabled={pwScore < 2 || mChangePwd.isPending}
                >
                  Valider
                </Button>
              </div>
            </Form>

            <p className="mt-3 text-xs text-muted">
              Après changement, vous serez déconnecté(e) et devrez vous
              reconnecter.
            </p>
          </div>
        </div>
      )}
    </>
  );
}

/* =================== sous-composants =================== */

function ReadRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="space-y-1">
      <div className="label">{label}</div>
      <div className="rounded-xl border border-token px-3.5 py-2.5">
        {value || "—"}
      </div>
    </div>
  );
}

function labelRole(r: Me["role"]) {
  return r === "ADMIN" ? "Admin" : r === "DOCTOR" ? "Médecin" : "Secrétaire";
}

function RoleBadge({ role }: { role: Me["role"] }) {
  const color =
    role === "ADMIN"
      ? "var(--primary)"
      : role === "DOCTOR"
        ? "var(--success)"
        : "var(--warning)";
  return (
    <span className="badge" style={{ color }}>
      <Shield size={14} />
      <span className="ml-1">{labelRole(role)}</span>
    </span>
  );
}
