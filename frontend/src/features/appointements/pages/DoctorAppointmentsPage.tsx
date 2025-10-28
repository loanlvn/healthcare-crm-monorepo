/* eslint-disable @typescript-eslint/no-non-null-asserted-optional-chain */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
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

// ⚠️ Ne pas importer DoctorPicker ici côté DOCTOR (provoque /doctors -> 403)
// import DoctorPicker from "@/features/appointements/services/DoctorPicker";
import PatientPicker from "@/features/appointements/services/PatientPickerAppointments";
import { fetchDoctorById, type DoctorDTO } from "@/features/doctors/service/doctors";

// utils dates
import { toISO, toLocalInput } from "../services/utilsAppointments";

export default function DoctorAppointmentsPage() {
  const { user } = useAuth();
  const doctorId = (user as any)?.doctorId ?? user?.id!; // ajuste si ton auth stocke doctorId séparément
  const [params, setParams] = useState({ page: 1, pageSize: 15 } as any);
  const { data, isLoading, error } = useListAppointments(params);
  const create = useCreateAppointment();
  const cancel = useCancelAppointment();
  const reminder = useForceReminder();

  return (
    <div className="p-4">
      <h1 className="text-lg font-semibold mb-2">Mes rendez-vous</h1>

      <AppointmentsFilters
        onChange={(range) => setParams((p: any) => ({ ...p, ...range, page: 1 }))}
      />

      {/* -------- Formulaire de création (doctorId verrouillé = user.id) -------- */}
      <div className="mb-4">
        <DoctorCreateAppointmentForm
          doctorId={doctorId}
          onSubmit={(payload) => create.mutate({ ...payload, doctorId })} // doctorId forcé côté parent
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
/*                 Formulaire création côté DOCTOR (doctorId fixé)            */
/* -------------------------------------------------------------------------- */

function DoctorCreateAppointmentForm({
  doctorId,
  onSubmit,
  isSubmitting,
}: {
  doctorId: string;
  onSubmit: (payload: {
    patientId: string;
    doctorId: string;         // sera écrasé par user.id à l’appel parent
    startsAt: string;         // ISO
    endsAt: string;           // ISO
    reason?: string;
    location?: string;
    notes?: string;
    status?: "SCHEDULED" | "CONFIRMED" | "CANCELLED" | "NO_SHOW" | "DONE";
  }) => void;
  isSubmitting?: boolean;
}) {
  // Charge UNIQUEMENT le profil du médecin courant (pas la liste)
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
  const [status, setStatus] =
    useState<"SCHEDULED" | "CONFIRMED" | "CANCELLED" | "NO_SHOW" | "DONE">("SCHEDULED");

  const valid =
    !!patientId && !!startsAt && !!endsAt && new Date(startsAt) < new Date(endsAt);

  return (
    <form
      className="flex flex-col gap-2 border p-3 rounded"
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid) return;
        onSubmit({
          doctorId,                // valeur locale (verrouillée visuellement), écrasée au parent
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
      {/* Docteur (affiché, non modifiable, SANS DoctorPicker) */}
      <input type="hidden" name="doctorId" value={doctorId} />
      <div className="text-sm text-gray-700 border rounded px-2 py-1 bg-gray-50">
        {meAsDoctor
          ? `${meAsDoctor.firstName} ${meAsDoctor.lastName}` +
            (meAsDoctor.doctorProfile?.specialties?.length
              ? ` — ${meAsDoctor.doctorProfile.specialties.join(", ")}`
              : "")
          : "Moi (Docteur)"}
      </div>

      {/* Patient : filtré automatiquement par owner côté hook (role=DOCTOR) */}
      <label className="flex flex-col gap-1">
        Patient
        <PatientPicker
          value={patientId}
          onChange={(id) => setPatientId(id || "")}
          required
        />
      </label>

      {/* Plages horaires */}
      <label className="flex flex-col gap-1">
        Début
        <input
          className="border p-1 w-full"
          type="datetime-local"
          value={startsAt}
          onChange={(e) => setStartsAt(e.target.value)}
          required
        />
      </label>
      <label className="flex flex-col gap-1">
        Fin
        <input
          className="border p-1 w-full"
          type="datetime-local"
          value={endsAt}
          onChange={(e) => setEndsAt(e.target.value)}
          required
        />
      </label>

      {/* Détails */}
      <label className="flex flex-col gap-1">
        Raison
        <input className="border p-1 w-full" value={reason} onChange={(e) => setReason(e.target.value)} />
      </label>
      <label className="flex flex-col gap-1">
        Lieu
        <input className="border p-1 w-full" value={location} onChange={(e) => setLocation(e.target.value)} />
      </label>
      <label className="flex flex-col gap-1">
        Notes
        <textarea className="border p-1 w-full" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </label>

      {/* Statut initial (optionnel) */}
      <label className="flex flex-col gap-1">
        Statut
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
            Choisis un patient et vérifie la plage horaire.
          </span>
        )}
      </div>
    </form>
  );
}
