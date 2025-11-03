import type { ApptStatus } from "../../features/appointements/types/AppointmentsTypes";

const palette: Record<ApptStatus, string> = {
SCHEDULED: "bg-blue-100 text-blue-800",
CONFIRMED: "bg-emerald-100 text-emerald-800",
CANCELLED: "bg-rose-100 text-rose-800",
NO_SHOW: "bg-amber-100 text-amber-800",
DONE: "bg-gray-200 text-gray-700",
};


export function StatusBadge({ status }: { status: ApptStatus }) {
return (
<span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${palette[status]}`}>
{status}
</span>
);
}