/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, X, Loader2, Users, User2 } from "lucide-react";
import { useCreateConversation } from "@/features/chat/service/hooks";
import {
  fetchPatients,
  type Patient,
} from "../../patients/services/servicePatients";
import {
  fetchChatDirectory,
} from "../../chat/service/serviceChat";
import { type DirectoryUser } from "../../../lib/types";
import { Button } from "@/components/ui/ButtonUI";
import { cn } from "@/lib/cn";
import { RoleBadge } from "@/components/ui/RoleBadge";

type Role = "ADMIN" | "DOCTOR" | "SECRETARY";

// Highlight **opaque**
function highlight(text: string, query: string) {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-primary text-primary-foreground rounded px-0.5">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}

export default function NewConversationSheet({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (conversationId: string) => void;
}) {
  if (!open) return null;
  return (
    <>
      {/* Backdrop plein écran (clic ferme) */}
      <div
        className="fixed inset-0 z-40 bg-black/50"
        onClick={onClose}
        aria-hidden
      />

      {/* Panneau centré, 100% opaque */}
      <div
        role="dialog"
        aria-modal="true"
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[90vw] max-w-2xl max-h-[85vh] bg-background border rounded-2xl shadow-2xl"
      >
        <SheetContent onClose={onClose} onCreated={onCreated} />
      </div>
    </>
  );
}

function SheetContent({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (conversationId: string) => void;
}) {
  const [tab, setTab] = useState<"PATIENT" | "INTERNAL">("PATIENT");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<DirectoryUser[]>([]);
  const [roleFilter, setRoleFilter] = useState<Role | "ALL">("ALL");

  // createConv retourne { id }
  const createConv = useCreateConversation() as unknown as {
    mutateAsync: (body: {
      type: "PATIENT" | "INTERNAL";
      patientId?: string;
      participantIds?: string[];
    }) => Promise<{ id: string }>;
    isPending: boolean;
  };

  const canCreate =
    (tab === "PATIENT" && !!selectedPatient) ||
    (tab === "INTERNAL" && selectedUsers.length >= 1);

  async function submit() {
    if (!canCreate || createConv.isPending) return;

    if (tab === "PATIENT") {
      const out = await createConv.mutateAsync({
        type: "PATIENT",
        patientId: selectedPatient!.id,
        // participants internes optionnels sur PATIENT
        participantIds:
          selectedUsers.length > 0 ? selectedUsers.map((u) => u.id) : undefined,
      });
      onCreated(out.id);
      onClose();
    } else {
      const out = await createConv.mutateAsync({
        type: "INTERNAL",
        participantIds: selectedUsers.map((u) => u.id),
      });
      onCreated(out.id);
      onClose();
    }
  }

  function removeUser(id: string) {
    setSelectedUsers((prev) => prev.filter((u) => u.id !== id));
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b bg-background px-3 py-2">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold">Nouvelle conversation</div>
          <button className="btn btn-ghost" onClick={onClose} disabled={createConv.isPending}>
            Fermer
          </button>
        </div>
        <div className="mt-2 inline-grid grid-cols-2 rounded-xl border p-1 bg-muted/30">
          <button
            className={cn(
              "px-3 py-1.5 rounded-lg text-sm",
              tab === "PATIENT" ? "bg-background shadow-sm" : "text-muted"
            )}
            onClick={() => setTab("PATIENT")}
            disabled={createConv.isPending}
          >
            <span className="inline-flex items-center gap-1">
              <User2 size={14} /> Patient
            </span>
          </button>
          <button
            className={cn(
              "px-3 py-1.5 rounded-lg text-sm",
              tab === "INTERNAL" ? "bg-background shadow-sm" : "text-muted"
            )}
            onClick={() => setTab("INTERNAL")}
            disabled={createConv.isPending}
          >
            <span className="inline-flex items-center gap-1">
              <Users size={14} /> Interne
            </span>
          </button>
        </div>
      </div>

      {/* Corps */}
      <div className="flex-1 overflow-auto p-3 space-y-3">
        {tab === "PATIENT" ? (
          <>
            <Block title="Patient">
              <PatientPicker
                placeholder="Rechercher un patient…"
                onPick={(p) => setSelectedPatient(p)}
                selected={selectedPatient}
              />
            </Block>

            <Block
              title="Participants internes"
              action={
                <RoleChips
                  active={roleFilter}
                  onChange={(r) => setRoleFilter(r)}
                />
              }
            >
              <UserPicker
                role={roleFilter === "ALL" ? undefined : roleFilter}
                placeholder="Nom ou email…"
                onPick={(u) => {
                  setSelectedUsers((prev) =>
                    prev.find((p) => p.id === u.id) ? prev : [...prev, u]
                  );
                }}
              />
              <SelectionChips users={selectedUsers} onRemove={removeUser} />
              <p className="text-[11px] text-muted mt-1">
                Le DOCTOR propriétaire du patient pourra être ajouté côté
                backend automatiquement.
              </p>
            </Block>
          </>
        ) : (
          <>
            <Block
              title="Destinataires"
              action={
                <RoleChips
                  active={roleFilter}
                  onChange={(r) => setRoleFilter(r)}
                />
              }
            >
              <UserPicker
                role={roleFilter === "ALL" ? undefined : roleFilter}
                placeholder="Nom ou email…"
                onPick={(u) => {
                  setSelectedUsers((prev) =>
                    prev.find((p) => p.id === u.id) ? prev : [...prev, u]
                  );
                }}
              />
            </Block>

            <Block title="Participants sélectionnés">
              <SelectionChips users={selectedUsers} onRemove={removeUser} />
              <p className="text-[11px] text-muted mt-1">
                Ajoute une ou plusieurs personnes, puis clique sur Créer.
              </p>
            </Block>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="sticky bottom-0 z-10 border-t bg-background px-3 py-2 flex items-center justify-end gap-2">
        <Button variant="outline" onClick={onClose} disabled={createConv.isPending}>
          Annuler
        </Button>
        <Button onClick={submit} disabled={!canCreate || createConv.isPending} aria-busy={createConv.isPending}>
          {createConv.isPending ? "Création…" : "Créer"}
        </Button>
      </div>
    </div>
  );
}

/* -------------------------- UI building blocks -------------------------- */

function Block({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border bg-background p-3 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-xs font-medium tracking-tight">{title}</div>
        {action}
      </div>
      {children}
    </div>
  );
}

function RoleChips({
  active,
  onChange,
}: {
  active: Role | "ALL";
  onChange: (r: Role | "ALL") => void;
}) {
  const items: { key: Role | "ALL"; label: string }[] = [
    { key: "ALL", label: "Tous" },
    { key: "ADMIN", label: "Admin" },
    { key: "DOCTOR", label: "Docteur" },
    { key: "SECRETARY", label: "Secrétaire" },
  ];
  return (
    <div className="inline-flex gap-1">
      {items.map((it) => (
        <button
          key={it.key}
          onClick={() => onChange(it.key)}
          className={cn(
            "px-2 py-1 rounded-lg text-[11px] border",
            active === it.key ? "bg-background shadow-sm" : "text-muted"
          )}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}

function SelectionChips({
  users,
  onRemove,
}: {
  users: DirectoryUser[];
  onRemove: (id: string) => void;
}) {
  if (users.length === 0)
    return (
      <div className="text-[11px] text-muted border rounded-lg p-2">
        Aucun participant sélectionné.
      </div>
    );
  return (
    <div className="flex flex-wrap gap-1.5">
      {users.map((u) => (
        <span
          key={u.id}
          className="inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs bg-background"
        >
          <MiniAvatar name={`${u.firstName} ${u.lastName}`} role={u.role} />
          <span className="truncate max-w-[14rem]">
            {u.firstName} {u.lastName}
          </span>
          <button
            className="hover:text-destructive"
            onClick={() => onRemove(u.id)}
            aria-label="Retirer"
          >
            <X size={12} />
          </button>
        </span>
      ))}
    </div>
  );
}

function MiniAvatar({ name, role }: { name: string; role?: Role }) {
  const ini =
    (name ?? "")
      .split(/\s+/)
      .map((s) => s[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "•";
  const ring =
    role === "ADMIN"
      ? "inset 0 0 0 2px var(--primary)"
      : role === "DOCTOR"
        ? "inset 0 0 0 2px var(--success)"
        : role === "SECRETARY"
          ? "inset 0 0 0 2px var(--warning)"
          : "inset 0 0 0 2px var(--border)";
  return (
    <span
      className="h-5 w-5 grid place-items-center rounded-full bg-white text-[10px] font-semibold"
      style={{ boxShadow: ring }}
    >
      {ini}
    </span>
  );
}

/* ------------------------------- Pickers -------------------------------- */

function PatientPicker({
  placeholder,
  onPick,
  selected,
}: {
  placeholder: string;
  onPick: (p: Patient | null) => void;
  selected: Patient | null;
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [debounced, setDebounced] = useState(q);
  const [activeIdx, setActiveIdx] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(q.trim()), 200);
    return () => clearTimeout(id);
  }, [q]);

  const enabled = debounced.length >= 2;

  const { data, isFetching } = useQuery({
    queryKey: ["patients-picker", { q: debounced, page: 1, pageSize: 8 }],
    queryFn: () => fetchPatients({ q: debounced, page: 1, pageSize: 8 }),
    enabled,
    staleTime: 10_000,
  });

  const items = useMemo(() => data?.items ?? [], [data]);

  // outside click → close
  useEffect(() => {
    function onDocDown(e: MouseEvent) {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onDocDown);
    return () => document.removeEventListener("pointerdown", onDocDown);
  }, []);

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const t = items[activeIdx];
      if (t) pick(t);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  function pick(p: Patient) {
    onPick(p);
    setQ("");
    setActiveIdx(0);
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative isolate">
      <div className="flex items-center gap-2 rounded-xl border px-2 py-1.5 bg-background focus-within:ring-2 focus-within:ring-primary/30">
        <Search size={16} className="text-muted" />
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          className="w-full bg-transparent outline-none text-sm"
        />
        {q && (
          <button
            className="p-1 rounded hover:bg-muted"
            onClick={() => {
              setQ("");
              setActiveIdx(0);
              inputRef.current?.focus();
            }}
            aria-label="Effacer la recherche"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Sélection */}
      {selected && (
        <div className="mt-2 flex items-center gap-2 text-sm border rounded-lg px-2 py-1 bg-background">
          <span className="inline-flex items-center gap-2">
            <span
              className="h-6 w-6 grid place-items-center rounded-full bg-white text-[11px] font-semibold"
              style={{ boxShadow: "inset 0 0 0 2px oklch(55% 0.14 250)" }}
            >
              {(selected.firstName?.[0] ?? "") + (selected.lastName?.[0] ?? "")}
            </span>
            {selected.firstName} {selected.lastName}
          </span>
          <button
            className="ml-auto hover:text-destructive"
            onClick={() => onPick(null)}
            aria-label="Retirer le patient"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Panel */}
      {open && (
        <div
          className="absolute left-0 right-0 z-[60] mt-1 rounded-xl border bg-background shadow-2xl overflow-hidden ring-1 ring-black/5"
          style={{ maxHeight: 300 }}
          role="listbox"
        >
          <div className="px-3 py-1.5 text-[11px] text-muted flex items-center gap-2 border-b">
            {isFetching ? (
              <>
                <Loader2 size={14} className="animate-spin" /> Recherche…
              </>
            ) : enabled ? (
              <>
                Résultats pour{" "}
                <strong className="ml-1 opacity-80">{debounced}</strong>
              </>
            ) : (
              <>Tape au moins 2 caractères</>
            )}
          </div>

          <div className="max-h-[252px] overflow-auto">
            {enabled && !isFetching && items.length === 0 && (
              <div className="px-3 py-6 text-xs text-muted text-center">
                Aucun patient.
              </div>
            )}
            {enabled &&
              items.map((p, i) => (
                <button
                  key={p.id}
                  role="option"
                  aria-selected={i === activeIdx}
                  onMouseEnter={() => setActiveIdx(i)}
                  onClick={() => pick(p)}
                  className={cn(
                    "w-full px-3 py-2 flex items-center gap-3 hover:bg-muted/60",
                    i === activeIdx && "bg-muted"
                  )}
                >
                  <span
                    className="shrink-0 h-8 w-8 grid place-items-center rounded-full bg-white text-[11px] font-semibold"
                    style={{ boxShadow: "inset 0 0 0 2px oklch(55% 0.14 250)" }}
                  >
                    {(p.firstName?.[0] ?? "") + (p.lastName?.[0] ?? "")}
                  </span>

                  <div className="min-w-0 flex-1 text-left">
                    <div className="text-sm truncate">
                      {highlight(
                        `${p.firstName ?? ""} ${p.lastName ?? ""}`,
                        debounced
                      )}
                    </div>
                    {p.birthDate && (
                      <div className="text-[11px] text-muted truncate">
                        {highlight(p.birthDate, debounced)}
                      </div>
                    )}
                  </div>
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

function UserPicker({
  role,
  placeholder,
  onPick,
}: {
  role?: Role;
  placeholder: string;
  onPick: (u: DirectoryUser) => void;
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [debounced, setDebounced] = useState(q);
  const [activeIdx, setActiveIdx] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(q.trim()), 200);
    return () => clearTimeout(id);
  }, [q]);

  const enabled = debounced.length >= 2;
  const { data, isFetching } = useQuery({
    queryKey: [
      "directory-picker",
      { role: role ?? "ALL", q: debounced, page: 1, limit: 8 },
    ],
    queryFn: () =>
      fetchChatDirectory({
        role: role as any,
        q: debounced || undefined,
        page: 1,
        limit: 8,
      }),
    enabled,
    staleTime: 10_000,
  });

  const items = useMemo(() => data?.items ?? [], [data]);

  useEffect(() => {
    function onDocDown(e: MouseEvent) {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onDocDown);
    return () => document.removeEventListener("pointerdown", onDocDown);
  }, []);

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const t = items[activeIdx];
      if (t) pick(t);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  function pick(u: DirectoryUser) {
    onPick(u);
    setQ("");
    setActiveIdx(0);
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative isolate">
      <div className="flex items-center gap-2 rounded-xl border px-2 py-1.5 bg-background focus-within:ring-2 focus-within:ring-primary/30">
        <Search size={16} className="text-muted" />
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          className="w-full bg-transparent outline-none text-sm"
        />
        {q && (
          <button
            className="p-1 rounded hover:bg-muted"
            onClick={() => {
              setQ("");
              setActiveIdx(0);
              inputRef.current?.focus();
            }}
            aria-label="Effacer la recherche"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {open && (
        <div
          className="absolute left-0 right-0 z-[60] mt-1 rounded-xl border bg-background shadow-2xl overflow-hidden ring-1 ring-black/5"
          style={{ maxHeight: 300 }}
          role="listbox"
        >
          <div className="px-3 py-1.5 text-[11px] text-muted flex items-center gap-2 border-b">
            {isFetching ? (
              <>
                <Loader2 size={14} className="animate-spin" /> Recherche…
              </>
            ) : enabled ? (
              <>
                Résultats{" "}
                <span className="opacity-70">(rôle {role ?? "tous"})</span>
              </>
            ) : (
              <>Tape au moins 2 caractères</>
            )}
          </div>

          <div className="max-h-[252px] overflow-auto">
            {enabled && !isFetching && items.length === 0 && (
              <div className="px-3 py-6 text-xs text-muted text-center">
                Aucun utilisateur.
              </div>
            )}
            {enabled &&
              items.map((u, i) => (
                <button
                  key={u.id}
                  role="option"
                  aria-selected={i === activeIdx}
                  onMouseEnter={() => setActiveIdx(i)}
                  onClick={() => pick(u)}
                  className={cn(
                    "w-full px-3 py-2 flex items-center gap-3 hover:bg-muted/60",
                    i === activeIdx && "bg-muted"
                  )}
                >
                  <span
                    className="shrink-0 h-8 w-8 grid place-items-center rounded-full text-[11px] font-semibold bg-white"
                    style={{
                      boxShadow:
                        u.role === "ADMIN"
                          ? "inset 0 0 0 2px var(--primary)"
                          : u.role === "DOCTOR"
                            ? "inset 0 0 0 2px var(--success)"
                            : u.role === "SECRETARY"
                              ? "inset 0 0 0 2px var(--warning)"
                              : "inset 0 0 0 2px var(--border)",
                    }}
                  >
                    {`${(u.firstName ?? "").slice(0, 1)}${(u.lastName ?? "").slice(0, 1)}`.toUpperCase() ||
                      "•"}
                  </span>

                  <div className="min-w-0 flex-1 text-left">
                    <div className="flex items-center gap-2">
                      <span className="text-sm truncate">
                        {highlight(
                          `${u.firstName ?? ""} ${u.lastName ?? ""}`,
                          debounced
                        )}
                      </span>
                      <RoleBadge role={u.role as any} />
                    </div>
                    <div className="text-[11px] text-muted truncate">
                      {highlight(u.email ?? "", debounced)}
                    </div>
                  </div>
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
