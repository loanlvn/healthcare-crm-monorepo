/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPatient } from "../services/servicePatients";
import { Form } from "@/components/widget/Form";
import { TextField } from "@/components/widget/TextField";
import { Button } from "@/components/ui/ButtonUI";
import { useForm, Controller } from "react-hook-form";
import { useAuth } from "../../../store/auth";
import DoctorPicker from "@/features/appointements/services/doctorPicker";

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
  ownerId?: string;
};

function undefEmpty<T extends string | undefined | null>(v: T) {
  const s = (v ?? "").toString().trim();
  return s.length ? (s as any) : undefined;
}
function dateOnlyOrUndef(v?: string) {
  const s = (v ?? "").trim();
  return s ? s : undefined; // "YYYY-MM-DD"
}

async function applyApiErrorsToForm(form: ReturnType<typeof useForm<Input>>, e: any) {
  const body = await e?.response?.json?.().catch(() => null);

  let focused = false;
  const setField = (name: keyof Input, message: string) => {
    form.setError(name, { message });
    if (!focused) {
      form.setFocus(name);
      focused = true;
    }
  };
  const setGlobal = (message: string) => {
    form.setError("root", { message });
  };

  const details = body?.error?.details;
  if (Array.isArray(details) && details.length) {
    for (const d of details) {
      const path0 =
        (Array.isArray(d?.path) && d.path.length && String(d.path[0])) ||
        (typeof d?.field === "string" && d.field) || // fallback si jamais
        undefined;
      const msg = String(d?.message || "Champ invalide");
      if (path0 && (path0 in form.getValues())) setField(path0 as keyof Input, msg);
    }
    if (!focused) setGlobal(String(body?.error?.message || "Requête invalide."));
    return;
  }

  const issues = body?.error?.issues ?? body?.issues ?? body?.zodError?.issues;
  if (Array.isArray(issues) && issues.length) {
    for (const it of issues) {
      const path0 = Array.isArray(it?.path) && it.path.length ? String(it.path[0]) : undefined;
      const msg = String(it?.message ?? "Champ invalide");
      if (path0 && (path0 in form.getValues())) setField(path0 as keyof Input, msg);
    }
    if (!focused) setGlobal(String(issues[0]?.message || body?.error?.message || "Requête invalide."));
    return;
  }

  const dict = body?.errors ?? body?.fieldErrors;
  if (dict && typeof dict === "object") {
    let any = false;
    for (const [k, v] of Object.entries(dict)) {
      if (k in form.getValues()) {
        const msg = Array.isArray(v) ? String(v[0]) : String(v ?? "Champ invalide");
        setField(k as keyof Input, msg);
        any = true;
      }
    }
    if (!any) setGlobal(String(body?.message || "Requête invalide."));
    return;
  }

  const msg = body?.error?.message ?? body?.message ?? "Requête invalide.";
  setGlobal(String(msg));
}


export default function PatientCreatePage() {
  const { user } = useAuth();
  const role = user?.role;
  const isAdmin = role === "ADMIN";
  const isSec = role === "SECRETARY";
  const isDoc = role === "DOCTOR";

  const nav = useNavigate();
  const qc = useQueryClient();

  const form = useForm<Input>({
    defaultValues: {
      firstName: "",
      lastName: "",
      birthDate: "",
      phone: "",
      email: "",
      address: "",
      assuranceNumber: "",
      doctorName: "",
      notes: "",
      ownerId: isDoc ? user?.id : "", // docteur: imposé
    },
    mode: "onTouched",
  });

  const mut = useMutation({
    mutationFn: async (v: Input) => {
      const ownerId = (isAdmin || isSec) ? undefEmpty(v.ownerId) : undefEmpty(user?.id);

      const payload = {
        firstName: v.firstName.trim(),
        lastName: v.lastName.trim(),
        birthDate: dateOnlyOrUndef(v.birthDate),
        phone: undefEmpty(v.phone),
        email: undefEmpty(v.email),
        address: undefEmpty(v.address),
        assuranceNumber: undefEmpty(v.assuranceNumber),
        doctorName: undefEmpty(v.doctorName),
        notes: undefEmpty(v.notes),
        ownerId, // requis côté API
      };

      if (!payload.ownerId) {
        const fake = {
          response: {
            json: async () => ({
              errors: { ownerId: "Sélectionne un médecin propriétaire." },
            }),
          },
        };
        throw fake as any;
      }

      return createPatient(payload as any);
    },
    onSuccess: (created: any) => {
      qc.invalidateQueries({ queryKey: ["patients"] });
      nav(`/patients/${created.id}`, { replace: true });
    },
    onError: async (e: any) => {
      await applyApiErrorsToForm(form, e); 
    },
  });

  const errGlobal = form.formState.errors.root?.message;

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-lg font-semibold">Créer un patient</h1>

      {/* Message d'erreur global (ex: contraintes transverses, conflits, etc.) */}
      {errGlobal && (
        <div
          className="mb-2 rounded-xl border px-3 py-2 text-sm"
          style={{
            borderColor: "var(--border)",
            background: "color-mix(in oklab, var(--danger) 12%, transparent)",
            color: "var(--danger)",
          }}
        >
          {errGlobal}
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

        {/* Picker OWNER selon rôle */}
        {(isAdmin || isSec) ? (
          <div className="md:col-span-2">
            <label className="text-xs block mb-1 text-muted">Médecin propriétaire</label>
            <Controller
              name="ownerId"
              control={form.control}
              rules={{ required: "Sélectionne un médecin propriétaire." }}
              render={({ field }) => (
                <DoctorPicker
                  value={field.value}
                  onChange={(id) => field.onChange(id ?? "")}
                  placeholder="Rechercher un médecin…"
                  required
                />
              )}
            />
            {form.formState.errors.ownerId?.message && (
              <span className="text-xs text-red-600 mt-1">
                {form.formState.errors.ownerId.message}
              </span>
            )}
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
