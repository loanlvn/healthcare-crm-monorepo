export const pad = (n: number) => String(n).padStart(2, "0");

export function toLocalInput(iso?: string | Date) {
  if (!iso) return "";
  const d = typeof iso === "string" ? new Date(iso) : iso;
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}
export function toISO(local: string) {
  return new Date(local).toISOString();
}

export function statusLabel(s: string) {
  switch (s) {
    case "SCHEDULED": return "Planifié";
    case "CONFIRMED": return "Confirmé";
    case "CANCELLED": return "Annulé";
    case "NO_SHOW":   return "Absent";
    case "DONE":      return "Fait";
    default:          return s;
  }
}
