/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { motion } from "framer-motion";
import { toISO, toLocalInput } from "../services/utilsAppointments";
import type { AppointmentDTO } from "../types/AppointmentsTypes";

export function AppointmentForm({
  mode,
  initial,
  defaultDoctorId,
  onSubmit,
  onCancel,
}: {
  mode: "create" | "edit";
  initial?: AppointmentDTO;
  defaultDoctorId?: string;
  onSubmit: (data: {
    patientId: string;
    doctorId: string;
    startsAt: string;
    endsAt: string;
    reason?: string;
    location?: string;
    notes?: string;
    status?: AppointmentDTO["status"];
  }) => void;
  onCancel?: () => void;
}) {
  const [patientId, setPatientId] = useState(initial?.patientId ?? "");
  const [doctorId, setDoctorId] = useState(
    initial?.doctorId ?? defaultDoctorId ?? ""
  );
  const [startsAt, setStartsAt] = useState(toLocalInput(initial?.startsAt));
  const [endsAt, setEndsAt] = useState(toLocalInput(initial?.endsAt));
  const [reason, setReason] = useState(initial?.reason ?? "");
  const [location, setLocation] = useState(initial?.location ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [status, setStatus] = useState<AppointmentDTO["status"]>(
    initial?.status ?? "SCHEDULED"
  );

  const valid =
    !!patientId &&
    !!doctorId &&
    !!startsAt &&
    !!endsAt &&
    new Date(startsAt) < new Date(endsAt);

  return (
    <motion.form
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="grid grid-cols-1 md:grid-cols-2 gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid) return;
        onSubmit({
          patientId,
          doctorId,
          startsAt: toISO(startsAt),
          endsAt: toISO(endsAt),
          reason: reason || undefined,
          location: location || undefined,
          notes: notes || undefined,
          status,
        });
      }}
    >
      <div className="md:col-span-2">
        <label className="label">Patient ID *</label>
        <input
          className="input"
          value={patientId}
          onChange={(e) => setPatientId(e.target.value)}
          required
        />
      </div>
      <div className="md:col-span-2">
        <label className="label">Doctor ID *</label>
        <input
          className="input"
          value={doctorId}
          onChange={(e) => setDoctorId(e.target.value)}
          required
        />
      </div>
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
      {mode === "edit" && (
        <div className="md:col-span-2">
          <label className="label">Statut</label>
          <select
            className="select"
            value={status}
            onChange={(e) => setStatus(e.target.value as any)}
          >
            <option value="SCHEDULED">Planifié</option>
            <option value="CONFIRMED">Confirmé</option>
            <option value="CANCELLED">Annulé</option>
            <option value="NO_SHOW">Absent</option>
            <option value="DONE">Fait</option>
          </select>
        </div>
      )}

      <div className="md:col-span-2 flex items-center justify-between pt-4 border-t border-token">
        {!valid && (
          <span className="text-sm" style={{ color: "var(--warning)" }}>
            Vérifie les champs obligatoires et la plage horaire.
          </span>
        )}
        <div className="flex gap-2">
          {onCancel && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              className="btn btn-outline"
              onClick={onCancel}
            >
              Annuler
            </motion.button>
          )}
          <motion.button
            whileHover={{ scale: valid ? 1.02 : 1 }}
            whileTap={{ scale: valid ? 0.98 : 1 }}
            className={`btn ${valid ? "btn-primary" : "btn-outline opacity-60 cursor-not-allowed"}`}
            type="submit"
            disabled={!valid}
          >
            {mode === "create" ? "Créer" : "Enregistrer"}
          </motion.button>
        </div>
      </div>
    </motion.form>
  );
}
