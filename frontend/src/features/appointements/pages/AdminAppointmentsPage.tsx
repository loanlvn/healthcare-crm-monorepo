/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  useListAppointments, 
  useCreateAppointment, 
  useCancelAppointment, 
  useForceReminder 
} from "../services/hooksAppointments2";
import { AppointmentsTable } from "../components/AppointmentsTable";
import { AppointmentsFilters } from "../components/AppointmentsFilter";
import { Pager } from "../components/PragerAppointments";
import DoctorPicker from "@/features/appointements/services/doctorPicker";
import PatientPicker from "@/features/appointements/services/PatientPickerAppointments";
import { toISO, toLocalInput } from "../services/utilsAppointments";
import { Calendar, Plus, Users, Filter, ChevronDown, ChevronUp } from "lucide-react";

export default function AdminAppointmentsPage() {
  const [params, setParams] = useState({ page: 1, pageSize: 15 } as any);
  const [showAppointments, setShowAppointments] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
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
              <h1 className="text-2xl font-bold">Gestion des Rendez-vous</h1>
              <p className="text-muted text-sm">Interface d'administration</p>
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
                <Filter className="h-5 w-5" />
                <h2 className="text-sm font-semibold">Filtres</h2>
              </div>
              <AppointmentsFilters 
                onChange={(range) => setParams((p: any) => ({ ...p, ...range, page: 1 }))} 
              />
            </motion.section>

            {/* Actions Rapides */}
            <motion.section
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="card p-5"
            >
              <h2 className="text-sm font-semibold mb-3">Actions rapides</h2>
              <div className="flex flex-col gap-2">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowCreateForm((s) => !s)}
                  className="btn btn-primary justify-center"
                >
                  <Plus className="h-4 w-4" />
                  Nouveau rendez-vous
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowAppointments((s) => !s)}
                  className="btn btn-outline justify-between"
                >
                  <span className="inline-flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Voir les rendez-vous
                  </span>
                  {showAppointments ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </motion.button>
              </div>
            </motion.section>
          </div>

          {/* Contenu Principal */}
          <div className="lg:col-span-2 space-y-6">
            {/* Formulaire de création */}
            <AnimatePresence initial={false}>
              {showCreateForm && (
                <motion.section
                  key="create"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="card overflow-hidden"
                >
                  <div className="p-5">
                    <h2 className="text-base font-semibold mb-4">Créer un nouveau rendez-vous</h2>
                    <AdminCreateAppointmentForm
                      onSubmit={(payload) => {
                        create.mutate(payload);
                        setShowCreateForm(false);
                      }}
                      isSubmitting={create.isPending}
                    />
                  </div>
                </motion.section>
              )}
            </AnimatePresence>

            {/* Liste des rendez-vous */}
            <AnimatePresence initial={false}>
              {showAppointments && (
                <motion.section
                  key="list"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="card overflow-hidden"
                >
                  <div className="p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-base font-semibold">Liste des rendez-vous</h2>
                      <span className="badge">
                        {(data?.meta?.total || 0)} au total
                      </span>
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
                        style={{
                          background: "color-mix(in oklab, var(--danger) 6%, var(--surface))",
                        }}
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
              )}
            </AnimatePresence>

            {/* État vide */}
            {!showAppointments && !showCreateForm && (
              <motion.section
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="card p-10 text-center"
              >
                <div className="mx-auto mb-3 inline-flex items-center justify-center rounded-2xl border border-token p-4 surface">
                  <Calendar className="h-10 w-10" />
                </div>
                <h3 className="text-base font-semibold mb-1">Gestion des rendez-vous</h3>
                <p className="text-muted mb-5">Créez de nouveaux rendez-vous ou consultez la liste existante</p>
                <div className="flex gap-2 justify-center">
                  <motion.button
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowCreateForm(true)}
                    className="btn btn-primary"
                  >
                    Créer un rendez-vous
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowAppointments(true)}
                    className="btn btn-outline"
                  >
                    Voir la liste
                  </motion.button>
                </div>
              </motion.section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


function AdminCreateAppointmentForm({
  onSubmit,
  isSubmitting,
}: {
  onSubmit: (payload: {
    patientId: string;
    doctorId: string;
    startsAt: string;
    endsAt: string;
    reason?: string;
    location?: string;
    notes?: string;
    status?: "SCHEDULED" | "CONFIRMED" | "CANCELLED" | "NO_SHOW" | "DONE";
  }) => void;
  isSubmitting?: boolean;
}) {
  const [doctorId, setDoctorId] = useState("");
  const [patientId, setPatientId] = useState("");

  const now = new Date();
  const in30 = new Date(now.getTime() + 30 * 60 * 1000);

  const [startsAt, setStartsAt] = useState(toLocalInput(now));
  const [endsAt, setEndsAt] = useState(toLocalInput(in30));
  const [reason, setReason] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<
    "SCHEDULED" | "CONFIRMED" | "CANCELLED" | "NO_SHOW" | "DONE"
  >("SCHEDULED");

  const valid =
    !!doctorId &&
    !!patientId &&
    !!startsAt &&
    !!endsAt &&
    new Date(startsAt) < new Date(endsAt);

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
      {/* Docteur */}
      <div className="md:col-span-2">
        <label className="label">Médecin *</label>
        <DoctorPicker
          value={doctorId}
          onChange={(id: any) => {
            setDoctorId(id || "");
            setPatientId("");
          }}
          required
        />
      </div>

      {/* Patient */}
      <div className="md:col-span-2">
        <label className="label">Patient *</label>
        <PatientPicker
          value={patientId}
          onChange={(id) => setPatientId(id || "")}
          ownerId={doctorId || undefined}
          required
        />
      </div>

      {/* Plages horaires */}
      <div>
        <label className="label">Début *</label>
        <input
          className="input"
          type="datetime-local"
          value={startsAt}
          onChange={(e) => setStartsAt(e.target.value)}
          required
        />
      </div>
      <div>
        <label className="label">Fin *</label>
        <input
          className="input"
          type="datetime-local"
          value={endsAt}
          onChange={(e) => setEndsAt(e.target.value)}
          required
        />
      </div>

      {/* Détails */}
      <div className="md:col-span-2">
        <label className="label">Raison</label>
        <input 
          className="input" 
          value={reason} 
          onChange={(e) => setReason(e.target.value)} 
        />
      </div>
      
      <div className="md:col-span-2">
        <label className="label">Lieu</label>
        <input 
          className="input" 
          value={location} 
          onChange={(e) => setLocation(e.target.value)} 
        />
      </div>
      
      <div className="md:col-span-2">
        <label className="label">Notes</label>
        <textarea 
          className="input resize-none" 
          rows={3}
          value={notes} 
          onChange={(e) => setNotes(e.target.value)} 
        />
      </div>

      {/* Statut */}
      <div className="md:col-span-2">
        <label className="label">Statut</label>
        <select 
          className="select" 
          value={status} 
          onChange={e => setStatus(e.target.value as any)}
        >
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
              Choisis un médecin, un patient et vérifie la plage horaire.
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