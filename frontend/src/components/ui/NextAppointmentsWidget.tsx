import { useMemo } from "react";
import { useListAppointments } from "../../features/appointements/services/hooksAppointments";
import type {
  ListParams,
  ListResponse,
  AppointmentDTO,
} from "../../features/appointements/services/serviceAppointments";
import { StatusBadge } from "../../components/ui/StatusBadge";

export function NextAppointmentsWidget({
  title = "À venir",
}: {
  title?: string;
  pageSize?: number;
  showViewAll?: boolean;
}) {
  // Params stables: maintenant → +7 jours, 5 résultats
  const params = useMemo<ListParams>(() => {
    const now = new Date();
    const in7 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return {
      from: now.toISOString(),
      to: in7.toISOString(),
      page: 1,
      pageSize: 5,
    };
  }, []);

  const { data, isFetching } = useListAppointments(params) as {
    data?: ListResponse<AppointmentDTO>;
    isFetching: boolean;
  };

  const items = data?.items ?? [];

  return (
    <div className="rounded-2xl border p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-semibold">{title}</h3>
        <span className="text-xs opacity-60">{isFetching ? "Maj…" : null}</span>
      </div>

      <ul className="space-y-2">
        {items.map((a) => (
          <li key={a.id} className="flex items-center justify-between">
            <div className="min-w-0">
              <div className="truncate font-medium">
                {fullName(a.patient) || a.patientId}
              </div>
              <div className="truncate text-xs opacity-70">
                {fmtDate(a.startsAt)} · {fmtTime(a.startsAt)} · {a.location ?? "—"}
              </div>
            </div>
            <StatusBadge status={a.status} />
          </li>
        ))}

        {items.length === 0 && (
          <li className="text-sm opacity-70">Aucun rendez-vous</li>
        )}
      </ul>
    </div>
  );
}

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
