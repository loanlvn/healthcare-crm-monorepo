// src/features/chat/components/QuickDirect.tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchChatDirectory } from "@/features/chat/service/serviceChat";
import { type DirectoryUser } from "@/lib/types";
import { useCreateConversation } from "@/features/chat/service/hooks";
import { cn } from "@/lib/cn";
import { Search, X, Loader2 } from "lucide-react";
import { RoleBadge } from "@/components/ui/RoleBadge";

type Props = {
  onOpenConversation: (conversationId: string) => void;
  className?: string;
};

export default function QuickDirect({ onOpenConversation, className }: Props) {
  // UI state
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const createConv = useCreateConversation();

  // debounce (200ms)
  const [debounced, setDebounced] = useState(q);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(q.trim()), 200);
    return () => clearTimeout(id);
  }, [q]);

  const enabled = debounced.length >= 2;

  // data
  const { data, isFetching } = useQuery({
    queryKey: ["chat-directory", { q: debounced, page: 1, limit: 8 }],
    queryFn: () => fetchChatDirectory({ q: debounced, page: 1, limit: 8 }),
    enabled,
    staleTime: 10_000,
  });

  const items = useMemo<DirectoryUser[]>(() => data?.items ?? [], [data]);

  // outside click → close (pointerdown pour fiabilité)
  useEffect(() => {
    function onDocDown(e: MouseEvent) {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onDocDown);
    return () => document.removeEventListener("pointerdown", onDocDown);
  }, []);

  useEffect(() => {
    // open the panel when user starts typing
    if (q.length > 0) setOpen(true);
  }, [q]);

  // keyboard navigation
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
      const target = items[activeIdx];
      if (target) startDM(target.id);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  async function startDM(userId: string) {
    if (createConv.isPending) return;
    try {
      const out: any = await createConv.mutateAsync({
        type: "INTERNAL",
        participantIds: [userId],
      });
      setOpen(false);
      setQ("");
      setActiveIdx(0);
      onOpenConversation(out.id);
    } catch (err) {
      // Optionnel: brancher un toast ici
      console.error(err);
    }
  }

  function initials(first?: string | null, last?: string | null) {
    const s = `${(first ?? "").slice(0, 1)}${(last ?? "").slice(0, 1)}`.toUpperCase();
    return s || "•";
  }

  function roleRing(role?: DirectoryUser["role"]) {
    switch (role) {
      case "ADMIN":
        return "inset 0 0 0 2px var(--primary)";
      case "DOCTOR":
        return "inset 0 0 0 2px var(--success)";
      case "SECRETARY":
        return "inset 0 0 0 2px var(--warning)";
      default:
        return "inset 0 0 0 2px var(--border)";
    }
  }

  // Highlight **opaque** (pas de transparence)
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

  // suggestions quand pas de recherche (à peupler si besoin)
  const suggestions: Pick<DirectoryUser, "id" | "firstName" | "lastName" | "email" | "role">[] = [];

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <div className="flex items-center gap-2 rounded-xl border px-2 py-1.5 bg-background focus-within:ring-2 focus-within:ring-primary/30">
        <Search size={16} className="text-muted" />
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Qui contacter ? (nom, email…) "
          className="w-full bg-transparent outline-none text-sm"
          aria-expanded={open}
          aria-controls="qd-listbox"
          role="combobox"
          aria-activedescendant={open && items[activeIdx] ? `qd-opt-${items[activeIdx].id}` : undefined}
        />
        {q && (
          <button
            className="p-1 rounded hover:bg-muted"
            aria-label="Effacer"
            onClick={() => {
              setQ("");
              setActiveIdx(0);
              inputRef.current?.focus();
            }}
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Panneau flottant : OPAQUE, pas de blur */}
      {open && (
        <div
          id="qd-listbox"
          role="listbox"
          className="absolute left-0 right-0 z-20 mt-1 rounded-xl border bg-background shadow-2xl overflow-hidden"
          style={{ maxHeight: 360 }}
        >
          {/* Bandeau état */}
          <div className="px-3 py-1.5 text-[11px] text-muted flex items-center gap-2 border-b">
            {isFetching ? (
              <>
                <Loader2 size={14} className="animate-spin" /> Recherche…
              </>
            ) : enabled ? (
              <>
                Résultats pour <strong className="ml-1 opacity-80">{debounced}</strong>
              </>
            ) : (
              <>Tape au moins 2 caractères</>
            )}
          </div>

          {/* Liste résultats */}
          <div className="max-h-[304px] overflow-auto">
            {enabled && !isFetching && items.length === 0 && (
              <div className="px-3 py-6 text-xs text-muted text-center">Aucun résultat.</div>
            )}

            {enabled &&
              items.map((u, i) => {
                const selected = i === activeIdx;
                return (
                  <button
                    key={u.id}
                    id={`qd-opt-${u.id}`}
                    role="option"
                    aria-selected={selected}
                    onMouseEnter={() => setActiveIdx(i)}
                    onClick={() => startDM(u.id)}
                    disabled={createConv.isPending}
                    className={cn(
                      "w-full px-3 py-2 flex items-center gap-3 hover:bg-muted/60",
                      selected && "bg-muted",
                      createConv.isPending && "opacity-70 cursor-not-allowed"
                    )}
                  >
                    {/* avatar + anneau coloré */}
                    <div
                      className="shrink-0 h-8 w-8 grid place-items-center rounded-full text-[11px] font-semibold bg-white"
                      style={{ boxShadow: roleRing(u.role) }}
                    >
                      {initials(u.firstName, u.lastName)}
                    </div>

                    <div className="min-w-0 flex-1 text-left">
                      <div className="flex items-center gap-2">
                        <span className="text-sm truncate">
                          {highlight(`${u.firstName} ${u.lastName}`, debounced)}
                        </span>
                        <RoleBadge role={u.role as any} />
                      </div>
                      <div className="text-[11px] text-muted truncate">
                        {highlight(u.email ?? "", debounced)}
                      </div>
                    </div>
                  </button>
                );
              })}

            {/* Suggestions si pas de recherche */}
            {!enabled && !isFetching && suggestions.length > 0 && (
              <>
                <div className="px-3 pt-2 text-[11px] text-muted uppercase tracking-wide">Suggestions</div>
                {suggestions.map((u) => (
                  <button
                    key={u.id}
                    role="option"
                    aria-selected={false}
                    onClick={() => startDM(u.id)}
                    disabled={createConv.isPending}
                    className={cn(
                      "w-full px-3 py-2 flex items-center gap-3 hover:bg-muted/60",
                      createConv.isPending && "opacity-70 cursor-not-allowed"
                    )}
                  >
                    <div
                      className="shrink-0 h-8 w-8 grid place-items-center rounded-full text-[11px] font-semibold bg-white"
                      style={{ boxShadow: roleRing(u.role) }}
                    >
                      {initials(u.firstName, u.lastName)}
                    </div>
                    <div className="min-w-0 flex-1 text-left">
                      <div className="flex items-center gap-2">
                        <span className="text-sm truncate">
                          {u.firstName} {u.lastName}
                        </span>
                        <RoleBadge role={u.role as any} />
                      </div>
                      <div className="text-[11px] text-muted truncate">{u.email}</div>
                    </div>
                  </button>
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
