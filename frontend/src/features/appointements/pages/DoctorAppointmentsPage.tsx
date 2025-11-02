/* eslint-disable @typescript-eslint/no-non-null-asserted-optional-chain */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/store/auth";
import { useQuery } from "@tanstack/react-query";
import {
  useListAppointments,
  useCreateAppointment,
  useCancelAppointment,
  useForceReminder,
} from "../services/hooksAppointments2";
import { AppointmentsTable } from "../components/AppointmentsTable";
import { AppointmentsFilters } from "../components/AppointmentsFilter";
import { Pager } from "../components/PragerAppointments";
import PatientPicker from "@/features/appointements/services/PatientPickerAppointments";
import { fetchDoctorById, type DoctorDTO } from "@/features/doctors/service/doctors";
import { toISO, toLocalInput } from "../services/utilsAppointments";
import { Calendar } from "lucide-react";

export default function DoctorAppointmentsPage() {
  const { user } = useAuth();
  const doctorId = (user as any)?.doctorId ?? user?.id!; // ajuste selon ton auth
  const [params, setParams] = useState({ page: 1, pageSize: 15 } as any);
  const { data, isLoading, error } = useListAppointments(params);
  const create = useCreateAppointment();
  const cancel = useCancelAppointment();
  const reminder = useForceReminder();

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-6"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-2xl border border-token p-3 surface shadow-sm">
              <Calendar className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Mes rendez-vous</h1>
              <p className="text-muted text-sm">Vue praticien</p>
            </div>
          </div>
        </motion.header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Filtres */}
            <motion.section
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.05 }}
              className="card p-5"
            >
              <div className="flex items-center gap-2 mb-3">
                <h2 className="text-sm font-semibold">Filtres</h2>
              </div>
              <AppointmentsFilters
                onChange={(range) => setParams((p: any) => ({ ...p, ...range, page: 1 }))}
              />
            </motion.section>

            {/* Formulaire création (doctorId verrouillé) */}
            <motion.section
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="card p-5"
            >
              <h2 className="text-sm font-semibold mb-3">Nouveau rendez-vous</h2>
              <DoctorCreateAppointmentForm
                doctorId={doctorId}
                onSubmit={(payload) => create.mutate({ ...payload, doctorId })}
                isSubmitting={create.isPending}
              />
            </motion.section>
          </div>

          {/* Contenu principal */}
          <div className="lg:col-span-2 space-y-6">
            <AnimatePresence initial={false}>
              <motion.section
                key="list"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="card overflow-hidden"
              >
                <div className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base font-semibold">Mes rendez-vous</h2>
                    <span className="badge">{(data?.meta?.total || 0)} au total</span>
                  </div>

                  {isLoading && (
                    <div className="flex justify-center items-center py-10">
                      <motion.div
                        role="status"
                        aria-label="Chargement"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-7 h-7 rounded-full border-4"
                        style={{
                          borderColor: "var(--border)",
                          borderTopColor: "var(--primary)",
                        }}
                      />
                    </div>
                  )}

                  {error && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="border border-token rounded-xl p-3 text-sm"
                      style={{ background: "color-mix(in oklab, var(--danger) 6%, var(--surface))" }}
                    >
                      Erreur: {String((error as any)?.message || error)}
                    </motion.div>
                  )}

                  {data && (
                    <>
                      <AppointmentsTable
                        items={data.items}
                        onCancel={(id) => cancel.mutate(id)}
                        onForceReminder={(id) => reminder.mutate(id)}
                      />
                      <div className="mt-4">
                        <Pager meta={data.meta} onPage={(page) => setParams((p: any) => ({ ...p, page }))} />
                      </div>
                    </>
                  )}
                </div>
              </motion.section>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
function DoctorCreateAppointmentForm({
  doctorId,
  onSubmit,
  isSubmitting,
}: {
  doctorId: string;
  onSubmit: (payload: {
    patientId: string;
    doctorId: string; // écrasé par le parent
    startsAt: string;
    endsAt: string;
    reason?: string;
    location?: string;
    notes?: string;
    status?: "SCHEDULED" | "CONFIRMED" | "CANCELLED" | "NO_SHOW" | "DONE";
  }) => void;
  isSubmitting?: boolean;
}) {
  const { data: meAsDoctor } = useQuery<DoctorDTO>({
    enabled: !!doctorId,
    queryKey: ["doctor", doctorId],
    queryFn: () => fetchDoctorById(doctorId),
    staleTime: 10_000,
  });

  const now = new Date();
  const in30 = new Date(now.getTime() + 30 * 60 * 1000);

  const [patientId, setPatientId] = useState("");
  const [startsAt, setStartsAt] = useState(toLocalInput(now));
  const [endsAt, setEndsAt] = useState(toLocalInput(in30));
  const [reason, setReason] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<"SCHEDULED" | "CONFIRMED" | "CANCELLED" | "NO_SHOW" | "DONE">("SCHEDULED");

  const valid = !!patientId && !!startsAt && !!endsAt && new Date(startsAt) < new Date(endsAt);

  return (
    <motion.form
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="grid grid-cols-1 md:grid-cols-2 gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid) return;
        onSubmit({
          doctorId,
          patientId,
          startsAt: toISO(startsAt),
          endsAt: toISO(endsAt),
          reason: reason || undefined,
          location: location || undefined,
          notes: notes || undefined,
          status,
        });
      }}
    >
      {/* Médecin (non modifiable) */}
      <input type="hidden" name="doctorId" value={doctorId} />
      <div className="md:col-span-2">
        <label className="label">Médecin</label>
        <div className="surface border border-token rounded-xl px-3 py-2 text-sm">
          {meAsDoctor
            ? `${meAsDoctor.firstName} ${meAsDoctor.lastName}` +
              (meAsDoctor.doctorProfile?.specialties?.length
                ? ` — ${meAsDoctor.doctorProfile.specialties.join(", ")}`
                : "")
            : "Moi (Docteur)"}
        </div>
      </div>

      {/* Patient */}
      <div className="md:col-span-2">
        <label className="label">Patient *</label>
        <PatientPicker value={patientId} onChange={(id) => setPatientId(id || "")} required />
      </div>

      {/* Plages horaires */}
      <div>
        <label className="label">Début *</label>
        <input className="input" type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} required />
      </div>
      <div>
        <label className="label">Fin *</label>
        <input className="input" type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} required />
      </div>

      {/* Détails */}
      <div className="md:col-span-2">
        <label className="label">Raison</label>
        <input className="input" value={reason} onChange={(e) => setReason(e.target.value)} />
      </div>
      <div className="md:col-span-2">
        <label className="label">Lieu</label>
        <input className="input" value={location} onChange={(e) => setLocation(e.target.value)} />
      </div>
      <div className="md:col-span-2">
        <label className="label">Notes</label>
        <textarea className="input resize-none" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>

      {/* Statut initial */}
      <div className="md:col-span-2">
        <label className="label">Statut</label>
        <select className="select" value={status} onChange={(e) => setStatus(e.target.value as any)}>
          <option value="SCHEDULED">Planifié</option>
          <option value="CONFIRMED">Confirmé</option>
          <option value="CANCELLED">Annulé</option>
          <option value="NO_SHOW">Absent</option>
          <option value="DONE">Fait</option>
        </select>
      </div>

      {/* Actions */}
      <div className="md:col-span-2 flex items-center justify-between pt-4 border-t border-token">
        <div>
          {!valid && (
            <span className="text-sm" style={{ color: "var(--warning)" }}>
              Choisis un patient et vérifie la plage horaire.
            </span>
          )}
        </div>
        <motion.button
          whileHover={{ scale: valid ? 1.02 : 1 }}
          whileTap={{ scale: valid ? 0.98 : 1 }}
          className={`btn ${valid ? "btn-primary" : "btn-outline opacity-60 cursor-not-allowed"}`}
          type="submit"
          disabled={!valid || isSubmitting}
        >
          {isSubmitting ? (
            <div className="flex items-center gap-2">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-4 h-4 rounded-full border-2"
                style={{ borderColor: "#fff", borderTopColor: "transparent" }}
              />
              Création…
            </div>
          ) : (
            "Créer le rendez-vous"
          )}
        </motion.button>
      </div>
    </motion.form>
  );
}

