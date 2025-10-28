/* eslint-disable @typescript-eslint/no-explicit-any */
// src/features/appointments/components/DoctorPicker.tsx
import { useMemo, useState } from "react";
import { useDebouncedValue } from "./hooksAppointments2";
import { useDoctors } from "../../doctors/service/hooksDoctor"; 
import type { DoctorLite } from "../../doctors/service/hooksDoctor";

// DoctorPicker.tsx
export default function DoctorPicker({
  value, onChange, required, disabled, pageSize = 20, className,
  placeholder = "Rechercher un médecin…",
}: {
  value?: string;
  onChange: (id: string | undefined, doctor?: DoctorLite) => void;
  required?: boolean;
  disabled?: boolean;
  pageSize?: number;
  className?: string;
  placeholder?: string;
}) {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const debouncedQ = useDebouncedValue(q, 250);

  const { data, isLoading, isFetching } = useDoctors({
    q: debouncedQ || undefined,
    page,
    pageSize,
    orderBy: "lastName",
    order: "asc",
  } as any);

  const selected = useMemo(() => data?.items?.find(d => d.id === value), [data, value]);
  const meta = (data as any)?.meta ?? { page, pageSize, total: undefined as number | undefined };
  const lastPage = meta.total
    ? Math.max(1, Math.ceil(meta.total / (meta.pageSize || pageSize)))
    : page + ((data?.items?.length ?? 0) === (meta.pageSize || pageSize) ? 1 : 0);

  return (
    <div className={["flex flex-col gap-1", className].filter(Boolean).join(" ")}>
      <div className="flex gap-2">
        <input
          className="w-full rounded-xl border border-token px-3 py-2.5 bg-surface text-fg focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          placeholder={placeholder}
          value={q}
          onChange={e => { setQ(e.target.value); setPage(1); }}
          disabled={disabled}
          required={required && !value}
        />
        <input
          className="w-full rounded-xl border border-token px-3 py-2.5 bg-surface text-fg"
          value={selected ? `${selected.lastName.toUpperCase()} ${selected.firstName}` : ""}
          readOnly
          placeholder="Aucun sélectionné"
        />
      </div>

      <div className="border border-token rounded-xl max-h-48 overflow-auto bg-surface">
        {isLoading && <div className="p-2 text-sm text-fg">Chargement…</div>}
        {!isLoading && (data?.items?.length ?? 0) === 0 && <div className="p-2 text-sm text-fg">Aucun résultat</div>}
        <ul>
          {data?.items?.map(d => {
            const full = `${d.lastName.toUpperCase()} ${d.firstName}`;
            const sub = d.email || d.id;
            const active = d.id === value;
            return (
              <li key={d.id}
                  className={`px-3 py-2 cursor-pointer hover:bg-primary/5 ${active ? "bg-primary/10" : ""}`}
                  onClick={() => onChange(d.id, d)}>
                <div className="text-sm text-fg">{full}</div>
                <div className="text-xs text-muted">{sub}</div>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="flex items-center gap-2 text-xs mt-1">
        <button 
          className="border border-token px-2 py-0.5 rounded hover:bg-primary/5 text-fg disabled:opacity-50" 
          onClick={() => setPage(p => Math.max(1, p - 1))} 
          disabled={meta.page! <= 1 || isFetching}
        >
          ◀
        </button>
        <span className="text-fg">Page {meta.page} / {lastPage}</span>
        <button 
          className="border border-token px-2 py-0.5 rounded hover:bg-primary/5 text-fg disabled:opacity-50" 
          onClick={() => setPage(p => Math.min(lastPage, p + 1))} 
          disabled={isFetching}
        >
          ▶
        </button>
        {value && (
          <button 
            className="ml-auto text-xs underline text-primary" 
            onClick={() => onChange(undefined)}
          >
            Effacer
          </button>
        )}
      </div>
    </div>
  );
}