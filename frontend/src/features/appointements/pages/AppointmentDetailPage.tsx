/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/store/auth";
import {
  useAppointment,
  useCancelAppointment,
  useForceReminder,
  useUpdateAppointment,
} from "../services/hooksAppointments2";
import type { AppointmentDTO } from "../types/AppointmentsTypes";
import { type UpdateAppointmentBody } from "../services/serviceAppointments2";
import { fetchPatientById } from "@/features/patients/services/servicePatients";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  ArrowLeft,
  CalendarClock,
  MapPin,
  Notebook,
  User2,
  Stethoscope,
  Check,
  X,
  Bell,
} from "lucide-react";

function fmt(dt?: string) {
  if (!dt) return "—";
  const d = new Date(dt);
  return d.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}
function fullName(p?: { firstName?: string | null; lastName?: string | null } | null) {
  if (!p) return "";
  return `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim();
}

export default function AppointmentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const role = user?.role;
  const isAdminSec = role === "ADMIN" || role === "SECRETARY";

  const { data, isLoading, error } = useAppointment(id);
  const cancel = useCancelAppointment();
  const remind = useForceReminder();
  const update = useUpdateAppointment(id!);

  const appt = data as AppointmentDTO | undefined;

  // ---- Patient (OK pour tous) ----
  const { data: fullPatient } = useQuery({
    enabled: !!appt?.patientId,
    queryKey: ["patient", appt?.patientId],
    queryFn: () => fetchPatientById(appt!.patientId),
    staleTime: 10_000,
    retry: 1,
  });

  // ---- IMPORTANT : on NE CHARGE PAS le docteur par id (pas de fetchDoctorById) ----
  // On dérive un libellé affichable UNIQUEMENT à partir du contenu du rendez-vous.
  const doctorLabel = useMemo(() => {
    if (!appt) return "—";
    // 1) si le DTO contient déjà un objet docteur peuplé
    const byObj = fullName((appt as any).doctor);
    if (byObj) return byObj;
    // 2) si le backend a mis des champs à plat (au cas où)
    const fn = (appt as any).doctorFirstName ?? "";
    const ln = (appt as any).doctorLastName ?? "";
    const flat = `${fn} ${ln}`.trim();
    if (flat) return flat;
    // 3) fallback : l'ID du docteur
    return appt.doctorId ?? "—";
  }, [appt]);

  // Spécialités : seulement si présentes dans l'objet déjà inclus
  const doctorSpecialties = useMemo(() => {
    const prof = (appt as any)?.doctor?.doctorProfile;
    if (Array.isArray(prof?.specialties) && prof.specialties.length > 0) {
      return prof.specialties.join(", ");
    }
    return ""; // pas d'affichage si vide
  }, [appt]);

  const canCancel = useMemo(() => {
    if (!appt) return false;
    return appt.status === "SCHEDULED" || appt.status === "CONFIRMED";
  }, [appt]);

  const canConfirm = useMemo(() => {
    if (!appt) return false;
    return appt.status === "SCHEDULED";
  }, [appt]);

  const canMarkDone = useMemo(() => {
    if (!appt) return false;
    return appt.status === "CONFIRMED";
  }, [appt]);

  if (isLoading) return <div className="p-4">Chargement…</div>;
  if (error) return <div className="p-4 text-red-600">Erreur : {String((error as any)?.message || error)}</div>;
  if (!appt) return <div className="p-4">Consultation introuvable.</div>;

  const onQuickUpdate = (body: UpdateAppointmentBody) => {
    update.mutate(body); // patch direct
  };

  return (
    <div className="p-4 space-y-4">
      <button className="btn" onClick={() => navigate(-1)}>
        <ArrowLeft size={16} /> Retour
      </button>

      <header className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <CalendarClock size={20} /> Consultation
        </h1>
        <StatusBadge status={appt.status} />
        <div className="ml-auto flex gap-2">
          {canConfirm && (
            <button
              className="btn btn-primary"
              onClick={() => onQuickUpdate({ status: "CONFIRMED" })}
              disabled={update.isPending}
              title="Marquer comme confirmé"
            >
              <Check size={16} /> Confirmer
            </button>
          )}
          {canMarkDone && (
            <button
              className="btn"
              onClick={() => onQuickUpdate({ status: "DONE" })}
              disabled={update.isPending}
              title="Marquer comme fait"
            >
              <Check size={16} /> Fait
            </button>
          )}
          {canCancel && (
            <button
              className="btn"
              onClick={() => cancel.mutate(appt.id)}
              disabled={cancel.isPending}
              title="Annuler le rendez-vous"
            >
              <X size={16} /> Annuler
            </button>
          )}
          <button
            className="btn"
            onClick={() => remind.mutate(appt.id)}
            disabled={remind.isPending}
            title="Relancer le rappel"
          >
            <Bell size={16} /> Rappel
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Carte patient */}
        <section className="rounded-2xl border p-4">
          <h3 className="font-semibold mb-2 flex items-center gap-2">
            <User2 size={16} /> Patient
          </h3>
          <div className="space-y-1">
            <div className="text-lg font-medium">
              {appt.patientId ? (
                <Link className="hover:underline" to={`/patients/${appt.patientId}`}>
                  {fullName(fullPatient) || fullName(appt.patient) || appt.patientId}
                </Link>
              ) : (
                "—"
              )}
            </div>
            <div className="text-sm text-muted-foreground">{fullPatient?.email ?? "—"}</div>
            {fullPatient?.phone && <div className="text-sm">{fullPatient.phone}</div>}
            {fullPatient?.address && <div className="text-sm">{fullPatient.address}</div>}
          </div>
        </section>

        {/* Carte médecin (sans fetch par id) */}
        <section className="rounded-2xl border p-4">
          <h3 className="font-semibold mb-2 flex items-center gap-2">
            <Stethoscope size={16} /> Médecin
          </h3>
          <div className="space-y-1">
            <div className="text-lg font-medium">
              {appt.doctorId ? (
                isAdminSec ? (
                  <Link className="hover:underline" to={`/doctors/${appt.doctorId}`}>
                    {doctorLabel}
                  </Link>
                ) : (
                  <span>{doctorLabel}</span>
                )
              ) : (
                "—"
              )}
            </div>
            {doctorSpecialties ? (
              <div className="text-sm text-muted-foreground">{doctorSpecialties}</div>
            ) : (
              <div className="text-sm text-muted-foreground">—</div>
            )}
          </div>
        </section>

        {/* Carte horaire / lieu */}
        <section className="rounded-2xl border p-4">
          <h3 className="font-semibold mb-2 flex items-center gap-2">
            <CalendarClock size={16} /> Horaire & lieu
          </h3>
          <div className="space-y-1">
            <div className="text-sm">Début</div>
            <div className="font-medium">{fmt(appt.startsAt)}</div>
            <div className="text-sm mt-2">Fin</div>
            <div className="font-medium">{fmt(appt.endsAt)}</div>
            <div className="text-sm mt-2 flex items-center gap-2">
              <MapPin size={14} /> Lieu
            </div>
            <div className="font-medium">{appt.location ?? "—"}</div>
          </div>
        </section>
      </div>

      {/* Détails */}
      <section className="rounded-2xl border p-4">
        <h3 className="font-semibold mb-2 flex items-center gap-2">
          <Notebook size={16} /> Détails
        </h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-muted-foreground">Motif</div>
            <div className="font-medium">{appt.reason ?? "—"}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Notes</div>
            <div className="font-medium whitespace-pre-wrap">{appt.notes ?? "—"}</div>
          </div>
        </div>
      </section>

      <style>{`
        .btn{ @apply inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm border border-token; }
        .btn-primary{ @apply bg-black text-white border-transparent hover:opacity-90; }
      `}</style>
    </div>
  );
}
