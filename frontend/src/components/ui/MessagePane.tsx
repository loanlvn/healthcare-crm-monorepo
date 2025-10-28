/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import { Clipboard, CornerDownLeft, MoreHorizontal } from "lucide-react";
import { useMessages, useMarkRead } from "../../features/chat/service/hooks";
import { cn } from "../../lib/cn";
import { RoleBadge } from "@/components/ui/RoleBadge";

type RoleLike = "ADMIN" | "DOCTOR" | "SECRETARY" | "PATIENT" | undefined;

type Attachment = {
  id?: string;
  url: string;
  name?: string;
  mime?: string;
};

type Msg = {
  id: string;
  conversationId: string;
  senderId: string;
  sender?: { firstName?: string | null; lastName?: string | null; role?: RoleLike };
  content?: string | null;
  attachments?: Attachment[];
  createdAt: string;
  editedAt?: string | null;
};

export default function MessagesPane({
  conversationId,
  currentUserId,
}: {
  conversationId: string;
  currentUserId: string;
}) {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, status } =
    useMessages(conversationId);
  const scrollRef = useRef<HTMLDivElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const mark = useMarkRead();

  // évite de re-marquer 1000x le même message
  const seenRef = useRef<Set<string>>(new Set());

  // reset le set quand on change de conversation
  useEffect(() => {
    seenRef.current.clear();
  }, [conversationId]);

  const msgsDesc = useMemo(
    () => (data?.pages ?? []).flatMap((p) => p.items as Msg[]),
    [data]
  );

  // tri ascendant (affichage du plus ancien au plus récent)
  const msgs = useMemo(() => {
    const arr = msgsDesc.slice().sort((a, b) => {
      const ta = Date.parse(a.createdAt);
      const tb = Date.parse(b.createdAt);
      return ta - tb;
    });
    return arr;
  }, [msgsDesc]);

  // Scroll auto en bas quand la conv change ou qu’on ajoute des messages en bas
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    // Simple: on force bas à chaque changement de taille
    el.scrollTop = el.scrollHeight;
  }, [conversationId, msgs.length]);

  // Infinite scroll vers le HAUT avec lock
  useEffect(() => {
    const root = scrollRef.current;
    const sent = topRef.current;
    if (!root || !sent) return;

    let locked = false;
    const io = new IntersectionObserver(
      async ([entry]) => {
        if (entry.isIntersecting && hasNextPage && !isFetchingNextPage && !locked) {
          locked = true;
          try {
            await fetchNextPage();
          } finally {
            locked = false;
          }
        }
      },
      { root, rootMargin: "200px 0px 0px 0px", threshold: 0 }
    );

    io.observe(sent);
    return () => io.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  // Marquage "lu" quand la bulle (d'un autre) devient visible
  useEffect(() => {
    const root = scrollRef.current;
    if (!root) return;

    const nodes = Array.from(root.querySelectorAll("[data-mid]")) as HTMLDivElement[];
    if (nodes.length === 0) return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;

          const el = e.target as HTMLDivElement;
          const id = el.getAttribute("data-mid")!;
          const sender = el.getAttribute("data-sender");

          // garde-fous
          if (!id) continue;
          if (!sender || sender === String(currentUserId)) continue; // pas mes propres messages
          if (seenRef.current.has(id)) continue; // déjà marqué dans cette session

          seenRef.current.add(id);
          mark.mutate(id);
        }
      },
      { root, threshold: 0.6, rootMargin: "0px 0px -10% 0px" }
    );

    nodes.forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, [msgs, currentUserId, mark]);

  if (status === "pending") return <div className="flex-1 p-4">Chargement…</div>;
  if (status === "error")
    return <div className="flex-1 p-4 text-destructive">Erreur de chargement</div>;

  // helpers UI
  const dayKey = (d: Date) => d.toLocaleDateString();
  const initiales = (f?: string | null, l?: string | null) =>
    (`${(f ?? "").slice(0, 1)}${(l ?? "").slice(0, 1)}`.toUpperCase() || "…");
  const roleTint = (role: RoleLike) => {
    switch (role) {
      case "ADMIN":
        return { ring: "var(--primary)", bg: "oklch(92% 0.06 30)" };
      case "DOCTOR":
        return { ring: "var(--success)", bg: "oklch(92% 0.06 150)" };
      case "SECRETARY":
        return { ring: "var(--warning)", bg: "oklch(95% 0.07 80)" };
      case "PATIENT":
        return { ring: "oklch(55% 0.14 250)", bg: "oklch(95% 0.05 250)" };
      default:
        return { ring: "var(--border)", bg: "var(--muted)" };
    }
  };
  const sameSender = (a: Msg | undefined, b: Msg | undefined) =>
    !!a && !!b && a.senderId === b.senderId;
  const sameDay = (a: Date, b: Date) => dayKey(a) === dayKey(b);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div
        ref={scrollRef}
        className="flex-1 overflow-auto px-4 py-3 flex flex-col gap-2"
        style={{ scrollbarGutter: "stable" }}
      >
        {/* sentinelle en haut */}
        <div ref={topRef} />

        {/* liste */}
        {msgs.map((m, idx) => {
          const mine = m.senderId === currentUserId;
          const prev = msgs[idx - 1];
          const next = msgs[idx + 1];

          const created = new Date(m.createdAt);
          const showDaySep = !prev || !sameDay(new Date(prev.createdAt), created);

          const firstOfGroup =
            !prev || !sameSender(prev, m) || !sameDay(new Date(prev.createdAt), created);
          const lastOfGroup =
            !next || !sameSender(next, m) || !sameDay(new Date(next.createdAt), created);

          const role = m.sender?.role;
          const name = m.sender
            ? `${m.sender.firstName ?? ""} ${m.sender.lastName ?? ""}`.trim()
            : "—";

          const tint = roleTint(role);
          const bubbleBase =
            "relative group rounded-2xl px-3 py-2 shadow-sm border max-w-[72%]";

          // bulles: mine -> primary FG/BG, autres -> teinte rôle
          const bubbleClass = cn(
            bubbleBase,
            mine
              ? "self-end bg-primary text-primary-foreground border-transparent"
              : "self-start text-foreground",
            !mine && "bg-[color:var(--bubble-bg)]"
          );

          // arrondis dynamiques (tail subtle)
          const radius = cn(
            firstOfGroup && mine && "rounded-tr-md",
            firstOfGroup && !mine && "rounded-tl-md",
            lastOfGroup && mine && "rounded-br-md",
            lastOfGroup && !mine && "rounded-bl-md"
          );

          // avatar affiché seulement au début du groupe (côté autres)
          const showAvatar = !mine && firstOfGroup;

          return (
            <div key={m.id}>
              {showDaySep && (
                <div className="sticky top-0 z-10 my-2 flex justify-center">
                  <span className="text-[10px] px-2 py-0.5 rounded-full border bg-background/80 backdrop-blur">
                    {created.toLocaleDateString(undefined, {
                      weekday: "short",
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
              )}

              <div className={cn("flex items-end gap-2", mine ? "justify-end" : "justify-start")}>
                {/* Avatar (autres) */}
                {!mine && (
                  <div className="w-8">
                    {showAvatar ? (
                      <div
                        className="h-8 w-8 grid place-items-center rounded-full text-[11px] font-semibold bg-white"
                        style={{ boxShadow: `inset 0 0 0 2px ${tint.ring}` }}
                        title={name}
                      >
                        {initiales(m.sender?.firstName, m.sender?.lastName)}
                      </div>
                    ) : (
                      <div className="h-2 w-8" />
                    )}
                  </div>
                )}

                {/* Bulle */}
                <motion.div
                  data-mid={m.id}
                  data-sender={m.senderId}
                  initial={{ opacity: 0, y: 4, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.16, delay: Math.min(idx, 8) * 0.015 }}
                  className={cn(bubbleClass, radius)}
                  style={!mine ? ({ ["--bubble-bg" as any]: tint.bg } as any) : undefined}
                >
                  {/* En-tête du 1er message du groupe : badge + nom */}
                  {firstOfGroup && (
                    <div
                      className={cn(
                        "mb-1 flex items-center gap-2 text-[11px]",
                        mine ? "justify-end opacity-80" : "justify-start opacity-70"
                      )}
                    >
                      {role && <RoleBadge role={role as any} />}
                      <span className="truncate">{name}</span>
                    </div>
                  )}

                  {/* Contenu texte */}
                  {m.content && (
                    <div className="text-sm whitespace-pre-wrap break-words">{m.content}</div>
                  )}

                  {/* Attachments */}
                  {Array.isArray(m.attachments) && m.attachments.length > 0 && (
                    <div className="mt-2 space-y-2">
                      {m.attachments.map((att) => {
                        const key = att.id ?? att.url;
                        const isImg = typeof att?.mime === "string" && att.mime.startsWith("image/");
                        return isImg ? (
                          <img
                            key={key}
                            src={att.url}
                            alt={att.name ?? "image"}
                            className={cn(
                              "max-w-full rounded-md border",
                              mine ? "border-white/20" : "border-border"
                            )}
                          />
                        ) : (
                          <a
                            key={key}
                            href={att.url}
                            target="_blank"
                            rel="noreferrer"
                            className={cn(
                              "text-xs underline break-all",
                              mine ? "text-primary-foreground" : "text-foreground"
                            )}
                          >
                            {att.name ?? att.url}
                          </a>
                        );
                      })}
                    </div>
                  )}

                  {/* Footer (heure + actions hover) */}
                  <div
                    className={cn(
                      "mt-1 flex items-center gap-2 text-[10px]",
                      mine ? "justify-end opacity-80" : "justify-between opacity-70"
                    )}
                  >
                    {!mine && (
                      <div className="invisible group-hover:visible flex items-center gap-1">
                        <button
                          className="hover:opacity-80"
                          title="Copier le message"
                          onClick={() => navigator.clipboard.writeText(m.content ?? "")}
                        >
                          <Clipboard size={14} />
                        </button>
                        <button className="hover:opacity-80" title="Répondre (à implémenter)">
                          <CornerDownLeft size={14} />
                        </button>
                        <button className="hover:opacity-80" title="Plus">
                          <MoreHorizontal size={14} />
                        </button>
                      </div>
                    )}
                    <span className={mine ? "text-primary-foreground/80" : ""}>
                      {created.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </motion.div>

                {/* Placeholder align côté mine pour équilibrer */}
                {mine && <div className="w-8" />}
              </div>
            </div>
          );
        })}

        {msgs.length === 0 && (
          <div className="text-xs text-muted-foreground">Aucun message.</div>
        )}

        {hasNextPage && (
          <div className="py-2 text-center text-[11px] text-muted-foreground">
            {isFetchingNextPage ? "Chargement…" : "Fais défiler vers le haut pour charger plus"}
          </div>
        )}
      </div>
    </div>
  );
}
