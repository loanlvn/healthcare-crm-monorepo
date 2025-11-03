import { useEffect, useMemo, useState } from "react";
import {
  useDeleteAppointment,
  useForceReminder,
  useListAppointments,
  useUpdateAppointment,
} from "../../features/appointements/services/hooksAppointments";
import type {
  AppointmentDTO,
  ListParams,
  ListResponse,
  UpdateAppointmentBody,
} from "../../features/appointements/services/serviceAppointments";
import { StatusBadge } from "./StatusBadge";
import { AppointmentEditor } from "../../features/appointements/pages/AppointmentEditor";

// Helpers date 
const pad = (n: number) => String(n).padStart(2, "0");

function toLocalInput(iso?: string | Date) {
  if (!iso) return "";
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}
function toISO(local?: string) {
  return local ? new Date(local).toISOString() : undefined;
}
function addDays(base: Date, days: number) {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

export function AppointmentsTable({ initial }: { initial?: Partial<ListParams> }) {
  // Pagination / filtres
  const [page, setPage] = useState(initial?.page ?? 1);
  const [pageSize, setPageSize] = useState(initial?.pageSize ?? 10);
  const [doctorId, setDoctorId] = useState<string | undefined>(initial?.doctorId);
  const [patientId, setPatientId] = useState<string | undefined>(initial?.patientId);

  // Inputs datetime-local
  const [fromLocal, setFromLocal] = useState("");
  const [toLocal, setToLocal] = useState("");

  // Init dates ([-30j, +30j] si rien dans initial)
  useEffect(() => {
    if (initial?.from) {
      setFromLocal(toLocalInput(initial.from));
    } else {
      setFromLocal(toLocalInput(addDays(new Date(), -30).toISOString()));
    }
    if (initial?.to) {
      setToLocal(toLocalInput(initial.to));
    } else {
      setToLocal(toLocalInput(addDays(new Date(), +30).toISOString()));
    }
  }, [initial?.from, initial?.to]);

  // Params API (ISO)
  const params = useMemo<ListParams>(
    () => ({
      from: toISO(fromLocal),
      to: toISO(toLocal),
      doctorId,
      patientId,
      page,
      pageSize,
    }),
    [fromLocal, toLocal, doctorId, patientId, page, pageSize]
  );

  const { data, isFetching, isPending } = useListAppointments(params) as {
    data?: ListResponse<AppointmentDTO>;
    isFetching: boolean;
    isPending: boolean;
  };

  const upd = useUpdateAppointment(params);
  const del = useDeleteAppointment(params);
  const remind = useForceReminder();

  // Editor
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<AppointmentDTO | null>(null);

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / pageSize));

  // Reset page on filters change
  useEffect(() => {
    setPage(1);
  }, [fromLocal, toLocal, doctorId, patientId, pageSize]);

  return (
    <div className="space-y-4">
      {/* Filtres */}
      <div className="flex flex-wrap items-end gap-3">
        <label className="label">
          De
          <input
            type="datetime-local"
            className="input"
            value={fromLocal}
            onChange={(e) => setFromLocal(e.target.value)}
          />
        </label>
        <label className="label">
          À
          <input
            type="datetime-local"
            className="input"
            value={toLocal}
            onChange={(e) => setToLocal(e.target.value)}
          />
        </label>
        <label className="label">
          Doctor ID
          <input
            className="input"
            value={doctorId ?? ""}
            onChange={(e) => setDoctorId(e.target.value || undefined)}
            placeholder="uuid (optionnel)"
          />
        </label>
        <label className="label">
          Patient ID
          <input
            className="input"
            value={patientId ?? ""}
            onChange={(e) => setPatientId(e.target.value || undefined)}
            placeholder="uuid (optionnel)"
          />
        </label>
        <label className="label">
          Par page
          <select
            className="select"
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
          >
            <option>10</option>
            <option>20</option>
            <option>50</option>
          </select>
        </label>
        <div className="ml-auto text-sm text-muted">
          {isFetching ? "Chargement…" : `${total} résultats`}
        </div>
      </div>

      {/* Table */}
      <div>
        <table className="table">
          <thead>
            <tr>
              <th className="th">Heure</th>
              <th className="th">Patient</th>
              <th className="th">Docteur</th>
              <th className="th">Statut</th>
              <th className="th">Lieu</th>
              <th className="th">Raison</th>
              <th className="th text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isPending &&
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={`sk-${i}`} className="row">
                  <td className="td" colSpan={7}>
                    <div className="h-4 w-1/3 rounded bg-[color:color-mix(in_oklab,var(--surface)92%,var(--border))]" />
                  </td>
                </tr>
              ))}

            {!isPending &&
              items.map((a) => (
                <tr key={a.id} className="row">
                  <td className="td whitespace-nowrap">
                    <div className="font-medium">
                      {fmtTime(a.startsAt)}–{fmtTime(a.endsAt)}
                    </div>
                    <div className="text-xs text-muted">{fmtDate(a.startsAt)}</div>
                  </td>
                  <td className="td">{fullName(a.patient) || a.patientId}</td>
                  <td className="td">{fullName(a.doctor) || a.doctorId}</td>
                  <td className="td">
                    <StatusBadge status={a.status} />
                  </td>
                  <td className="td">{a.location ?? "–"}</td>
                  <td className="td">{a.reason ?? "–"}</td>
                  <td className="td">
                    <div className="flex justify-end gap-2">
                      <button
                        className="btn btn-ghost"
                        onClick={() => {
                          setEditing(a);
                          setEditorOpen(true);
                        }}
                      >
                        Éditer
                      </button>
                      <button
                        className="btn btn-ghost"
                        onClick={() => remind.mutate(a.id)}
                        disabled={
                          a.status === "CANCELLED" ||
                          a.status === "DONE" ||
                          a.status === "NO_SHOW"
                        }
                      >
                        Rappel
                      </button>
                      <button
                        className="btn btn-outline"
                        style={{ color: "var(--danger)", borderColor: "var(--danger)" }}
                        onClick={() => del.mutate(a.id)}
                      >
                        Annuler
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

            {!isPending && items.length === 0 && (
              <tr>
                <td colSpan={7} className="td text-center text-sm text-muted">
                  Aucun rendez-vous
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm">
          Page {page} / {pages}
        </div>
        <div className="flex gap-2">
          <button
            className="btn btn-ghost"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Précédent
          </button>
          <button
            className="btn btn-ghost"
            disabled={page >= pages}
            onClick={() => setPage((p) => p + 1)}
          >
            Suivant
          </button>
        </div>
      </div>

      {/* Editor */}
      <AppointmentEditor
        open={editorOpen}
        onClose={() => {
          setEditorOpen(false);
          setEditing(null);
        }}
        initial={editing ? { ...editing, mode: "edit" } : undefined}
        onSubmit={(patch: UpdateAppointmentBody) => {
          if (!editing) return;
          upd.mutate({ id: editing.id, patch });
          setEditorOpen(false);
        }}
      />
    </div>
  );
}

// Formatters 
function fullName(
  x?: { firstName?: string | null; lastName?: string | null } | null
) {
  if (!x) return "";
  return `${x.firstName ?? ""} ${x.lastName ?? ""}`.trim() || "";
}
const dateFmt = new Intl.DateTimeFormat(undefined, {
  year: "numeric",
  month: "short",
  day: "2-digit",
});
const timeFmt = new Intl.DateTimeFormat(undefined, {
  hour: "2-digit",
  minute: "2-digit",
});
function fmtDate(iso: string) {
  return dateFmt.format(new Date(iso));
}
function fmtTime(iso: string) {
  return timeFmt.format(new Date(iso));
}

export default AppointmentsTable;
