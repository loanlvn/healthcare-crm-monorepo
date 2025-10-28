import { useMemo, useState } from "react";
import { useDebouncedValue } from "../services/hooksAppointments2";
import { usePatientsForPicker, usePatient, type PatientLite } from "@/features/patients/services/hooksPatients";


// PatientPickerAppointments.tsx
export default function PatientPicker({
  value, onChange, ownerId, required, disabled, pageSize = 20, className,
  placeholder = "Rechercher un patient…",
}: {
  value?: string;
  onChange: (id: string | undefined, patient?: PatientLite) => void;
  ownerId?: string;          
  required?: boolean;
  disabled?: boolean;
  pageSize?: number;
  className?: string;
  placeholder?: string;
}) {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const debouncedQ = useDebouncedValue(q, 250);

  const { data, isLoading, isFetching } = usePatientsForPicker({
    q: debouncedQ || undefined,
    ownerId,
    page,
    pageSize,
    orderBy: "lastName",
    order: "asc",
  });

  // fallback pour afficher le libellé même si le patient sélectionné n'est pas dans la page
  const { data: selected } = usePatient(value);
  const current = useMemo(
    () => (value ? data?.items?.find(p => p.id === value) || selected : undefined),
    [value, data, selected]
  );

  const meta = data?.meta ?? { page, pageSize, total: undefined as number | undefined };
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
          value={current ? `${current.lastName.toUpperCase()} ${current.firstName}` : ""}
          readOnly
          placeholder="Aucun sélectionné"
        />
      </div>

      <div className="border border-token rounded-xl max-h-48 overflow-auto bg-surface">
        {isLoading && <div className="p-2 text-sm text-fg">Chargement…</div>}
        {!isLoading && (data?.items?.length ?? 0) === 0 && <div className="p-2 text-sm text-fg">Aucun résultat</div>}
        <ul>
          {data?.items?.map(p => {
            const full = `${p.lastName.toUpperCase()} ${p.firstName}`;
            const sub = p.email || p.phone || p.id;
            const active = p.id === value;
            return (
              <li key={p.id}
                  className={`px-3 py-2 cursor-pointer hover:bg-primary/5 ${active ? "bg-primary/10" : ""}`}
                  onClick={() => onChange(p.id, p)}>
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