/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { X, Calendar, User, Stethoscope, MapPin, FileText } from "lucide-react";
import type {
  CreateAppointmentBody,
  UpdateAppointmentBody,
} from "../services/serviceAppointments2";
import type { ApptStatus } from "../types/AppointmentsTypes";
import DoctorPicker from "@/features/appointements/services/doctorPicker";
import PatientPicker from "@/features/appointements/services/PatientPickerAppointments";
import { Button } from "@/components/ui/ButtonUI";
import { TextInput } from "@/components/ui/Input";

// ----------------- utils -----------------
const pad = (n: number) => String(n).padStart(2, "0");

function toLocalInput(iso?: string | Date) {
  if (!iso) return "";
  const d = typeof iso === "string" ? new Date(iso) : iso;
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

function toApiISO(local: string) {
  return new Date(local).toISOString();
}

function emptyToUndef(s?: string) {
  return s && s.trim() !== "" ? s : undefined;
}

// props typées
type InitialCreate = {
  mode: "create";
  startsAt?: string;
  endsAt?: string;
  patientId?: string;
  doctorId?: string;
  reason?: string;
  location?: string;
  notes?: string;
  status?: ApptStatus;
};

type InitialUpdate = {
  mode: "update";
  id: string; 
  startsAt?: string;
  endsAt?: string;
  patientId?: string;
  doctorId?: string;
  reason?: string;
  location?: string;
  notes?: string;
  status?: ApptStatus;
};

type BaseProps = {
  open: boolean;
  onClose: () => void;
  userRole?: string;
  currentDoctorId?: string;
};

type CreateProps = BaseProps & {
  initial: InitialCreate;                          
  onSubmit: (data: CreateAppointmentBody) => void; 
};

type UpdateProps = BaseProps & {
  initial: InitialUpdate;
  onSubmit: (id: string, patch: UpdateAppointmentBody) => void;
};

export type AppointmentEditorProps = CreateProps | UpdateProps;

// composant
export function AppointmentEditor(props: AppointmentEditorProps) {
  const { open, onClose, userRole, currentDoctorId } = props;

  const isCreate = props.initial.mode === "create";
  const isDoctor = userRole === "DOCTOR";

  // États du formulaire
  const [doctorId, setDoctorId] = useState(
    props.initial.doctorId ?? (isDoctor ? currentDoctorId ?? "" : "")
  );
  const [patientId, setPatientId] = useState(props.initial.patientId ?? "");
  const [startsAt, setStartsAt] = useState(() => toLocalInput(props.initial.startsAt));
  const [endsAt, setEndsAt] = useState(() => toLocalInput(props.initial.endsAt));
  const [reason, setReason] = useState(props.initial.reason ?? "");
  const [location, setLocation] = useState(props.initial.location ?? "");
  const [notes, setNotes] = useState(props.initial.notes ?? "");
  const [status, setStatus] = useState<ApptStatus>(props.initial.status ?? "SCHEDULED");

  // Reset
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    if (!open) { setHydrated(false); return; }
    if (hydrated) return;

    const init = props.initial;
    setDoctorId(init.doctorId ?? (isDoctor ? currentDoctorId ?? "" : ""));
    setPatientId(init.patientId ?? "");
    setStartsAt(toLocalInput(init.startsAt));
    setEndsAt(toLocalInput(init.endsAt));
    setReason(init.reason ?? "");
    setLocation(init.location ?? "");
    setNotes(init.notes ?? "");
    setStatus(init.status ?? "SCHEDULED");

    setHydrated(true);
  }, [open, hydrated, isDoctor, currentDoctorId, props.initial]);

  // Validation
  const hasRequired = useMemo(() => {
    if (isCreate) return Boolean(patientId && doctorId && startsAt && endsAt);
    return Boolean(startsAt && endsAt);
  }, [isCreate, patientId, doctorId, startsAt, endsAt]);

  const rangeValid = useMemo(() => {
    if (!startsAt || !endsAt) return false;
    return new Date(endsAt).getTime() > new Date(startsAt).getTime();
  }, [startsAt, endsAt]);

  const canSubmit = hasRequired && rangeValid;

  // Close on Escape + lock scroll
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) onClose();
    };
    window.addEventListener("keydown", handleEscape);
    const prevOverflow = document.body.style.overflow;
    if (open) document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    if (isCreate) {
      const payload: CreateAppointmentBody = {
        patientId,
        doctorId: doctorId!,
        startsAt: toApiISO(startsAt),
        endsAt: toApiISO(endsAt),
        reason: emptyToUndef(reason),
        location: emptyToUndef(location),
        notes: emptyToUndef(notes),
        status,
      };
      (props as CreateProps).onSubmit(payload);
    } else {
      const patch: UpdateAppointmentBody = {
        startsAt: toApiISO(startsAt),
        endsAt: toApiISO(endsAt),
        reason: emptyToUndef(reason),
        location: emptyToUndef(location),
        notes: emptyToUndef(notes),
        status,
      };
      const { id } = (props as UpdateProps).initial;
      (props as UpdateProps).onSubmit(id, patch);
    }
  }

  if (!open) return null;

  return createPortal(
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-surface rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden border border-token shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-token bg-surface/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                <Calendar className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-fg">
                  {isCreate ? "Nouveau rendez-vous" : "Modifier le rendez-vous"}
                </h2>
                <p className="text-sm text-muted">
                  {isCreate ? "Créez un nouveau rendez-vous" : "Modifiez les détails du rendez-vous"}
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="hover:bg-surface"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[calc(90vh-120px)] overflow-y-auto">
            {/* Docteur et Patient */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-fg flex items-center gap-2">
                  <Stethoscope className="w-4 h-4" />
                  Médecin {!isDoctor && <span className="text-rose-600">*</span>}
                </label>
                {isDoctor ? (
                  <div className="p-3 rounded-xl border border-token bg-surface text-fg">
                    <div className="text-sm font-medium">Vous (Docteur)</div>
                    <input type="hidden" value={doctorId} />
                  </div>
                ) : (
                  <DoctorPicker
                    value={doctorId}
                    onChange={(id) => setDoctorId(id ?? "")}
                    required={!isDoctor}
                  />
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-fg flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Patient <span className="text-rose-600">*</span>
                </label>
                <PatientPicker
                  value={patientId}
                  onChange={(id) => setPatientId(id ?? "")}
                  ownerId={doctorId || undefined}
                  required
                />
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-fg">
                  Début <span className="text-rose-600">*</span>
                </label>
                <TextInput
                  id="startsAt"
                  name="startsAt"
                  type="datetime-local"
                  value={startsAt}
                  onChange={(e: any) => setStartsAt(e.target.value)}
                  onBlur={() => {}}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-fg">
                  Fin <span className="text-rose-600">*</span>
                </label>
                <TextInput
                  id="endsAt"
                  name="endsAt"
                  type="datetime-local"
                  value={endsAt}
                  onChange={(e: any) => setEndsAt(e.target.value)}
                  onBlur={() => {}}
                  required
                />
              </div>
            </div>

            {!rangeValid && startsAt && endsAt && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200">
                <p className="text-sm text-rose-700 flex items-center gap-2">
                  <X className="w-4 h-4" />
                  L'heure de fin doit être postérieure au début.
                </p>
              </div>
            )}

            {/* Statut et Lieu */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-fg">Statut</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as ApptStatus)}
                  className="w-full rounded-xl border border-token px-3 py-2.5 bg-surface text-fg focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="SCHEDULED">Planifié</option>
                  <option value="CONFIRMED">Confirmé</option>
                  <option value="CANCELLED">Annulé</option>
                  <option value="NO_SHOW">Absent</option>
                  <option value="DONE">Terminé</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-fg flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Lieu
                </label>
                <TextInput
                  id="location"
                  name="location"
                  value={location}
                  onChange={(e: any) => setLocation(e.target.value)}
                  onBlur={() => {}}
                  placeholder="Salle de consultation, adresse..."
                />
              </div>
            </div>

            {/* Raison */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-fg">Raison de la consultation</label>
              <TextInput
                id="reason"
                name="reason"
                value={reason}
                onChange={(e: any) => setReason(e.target.value)}
                onBlur={() => {}}
                placeholder="Motif de la consultation..."
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-fg flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Notes supplémentaires
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full rounded-xl border border-token px-3 py-2.5 bg-surface text-fg focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 min-h-[100px] resize-vertical"
                placeholder="Informations complémentaires..."
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-token">
              <Button type="button" variant="outline" onClick={onClose}>
                Annuler
              </Button>
              <Button type="submit" variant="primary" disabled={!canSubmit}>
                {isCreate ? "Créer le rendez-vous" : "Enregistrer les modifications"}
              </Button>
            </div>
          </form>
        </motion.div>
      </div>
    </>,
    document.body
  );
}
