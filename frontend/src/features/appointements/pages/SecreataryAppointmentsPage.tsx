/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import {
  useListAppointments,
  useCreateAppointment,
  useCancelAppointment,
  useForceReminder,
} from "../services/hooksAppointments2";
import { AppointmentsTable } from "../components/AppointmentsTable";
import { AppointmentsFilters } from "../components/AppointmentsFilter";
import { Pager } from "../components/PragerAppointments";

// 🧩 Pickers (ajuste les paths si besoin)
import DoctorPicker from "@/features/appointements/services/doctorPicker";
import PatientPicker from "@/features/appointements/services/PatientPickerAppointments";

// utils dates
import { toISO, toLocalInput } from "../services/utilsAppointments";

export default function SecretaryAppointmentsPage() {
  const [params, setParams] = useState({ page: 1, pageSize: 15 } as any);
  const { data, isLoading, error } = useListAppointments(params);
  const create = useCreateAppointment();
  const cancel = useCancelAppointment();
  const reminder = useForceReminder();

  return (
    <div className="p-4">
      <h1 className="text-lg font-semibold mb-2">Agenda de la clinique</h1>

      <AppointmentsFilters
        onChange={(range) => setParams((p: any) => ({ ...p, ...range, page: 1 }))}
      />

      {/* -------- Formulaire de création avec DoctorPicker + PatientPicker -------- */}
      <div className="mb-4">
        <SecretaryCreateAppointmentForm
          onSubmit={(payload) => create.mutate(payload)}
          isSubmitting={create.isPending}
        />
      </div>

      {isLoading && <p>Chargement…</p>}
      {error && <p className="text-red-600">Erreur: {String((error as any)?.message || error)}</p>}
      {data && (
        <>
          <AppointmentsTable
            items={data.items}
            onCancel={(id) => cancel.mutate(id)}
            onForceReminder={(id) => reminder.mutate(id)}
          />
          <Pager meta={data.meta} onPage={(page) => setParams((p: any) => ({ ...p, page }))} />
        </>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                 Formulaire création côté SECRETARY                         */
/* -------------------------------------------------------------------------- */

function SecretaryCreateAppointmentForm({
  onSubmit,
  isSubmitting,
}: {
  onSubmit: (payload: {
    patientId: string;
    doctorId: string;
    startsAt: string; // ISO
    endsAt: string;   // ISO
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
  const [status, setStatus] =
    useState<"SCHEDULED" | "CONFIRMED" | "CANCELLED" | "NO_SHOW" | "DONE">("SCHEDULED");

  const valid =
    !!doctorId &&
    !!patientId &&
    !!startsAt &&
    !!endsAt &&
    new Date(startsAt) < new Date(endsAt);

  return (
    <form
      className="flex flex-col gap-2 border p-3 rounded"
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
          status, // tu peux forcer "SCHEDULED" si tu préfères
        });
      }}
    >
      {/* Médecin */}
      <DoctorPicker
        value={doctorId}
        onChange={(id) => {
          setDoctorId(id || "");
          setPatientId(""); // reset patient si le médecin change
        }}
        required
      />

      {/* Patient — filtré par médecin sélectionné */}
      <PatientPicker
        value={patientId}
        onChange={(id) => setPatientId(id || "")}
        ownerId={doctorId || undefined}  
        required
      />

      {/* Plage horaire */}
      <label>Début
        <input
          className="border p-1 w-full"
          type="datetime-local"
          value={startsAt}
          onChange={(e) => setStartsAt(e.target.value)}
          required
        />
      </label>
      <label>Fin
        <input
          className="border p-1 w-full"
          type="datetime-local"
          value={endsAt}
          onChange={(e) => setEndsAt(e.target.value)}
          required
        />
      </label>

      {/* Détails */}
      <label>Raison
        <input className="border p-1 w-full" value={reason} onChange={(e) => setReason(e.target.value)} />
      </label>
      <label>Lieu
        <input className="border p-1 w-full" value={location} onChange={(e) => setLocation(e.target.value)} />
      </label>
      <label>Notes
        <textarea className="border p-1 w-full" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </label>

      {/* Statut initial (optionnel) */}
      <label>Statut
        <select className="border p-1 w-full" value={status} onChange={(e) => setStatus(e.target.value as any)}>
          <option value="SCHEDULED">Planifié</option>
          <option value="CONFIRMED">Confirmé</option>
          <option value="CANCELLED">Annulé</option>
          <option value="NO_SHOW">Absent</option>
          <option value="DONE">Fait</option>
        </select>
      </label>

      <div className="flex gap-2 mt-2">
        <button className="border px-3 py-1" type="submit" disabled={!valid || isSubmitting}>
          {isSubmitting ? "Création…" : "Créer le rendez-vous"}
        </button>
        {!valid && (
          <span className="text-xs text-gray-500 self-center">
            Choisis un médecin, un patient et vérifie la plage horaire.
          </span>
        )}
      </div>
    </form>
  );
}
