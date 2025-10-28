/* eslint-disable @typescript-eslint/no-explicit-any */
import { motion } from "framer-motion";
import { useConversations } from "../../features/chat/service/hooks";
import { Button } from "@/components/ui/ButtonUI";
import { cn } from "../../lib/cn";
import { useAuth } from "@/store/auth";

// Helpers d'affichage
function toTitle(c: any): string {
  // priorité au titre fourni par l'API
  if (c?.title && String(c.title).trim().length > 0) return String(c.title).trim();

  // fallback patient si pas de title
  if (c?.type === "PATIENT") {
    const first = c?.patient?.firstName ?? "Patient";
    const last = c?.patient?.lastName ?? "";
    return `${first} ${last}`.trim();
  }

  // fallback interne
  return "Interne";
}

function toSnippet(c: any, max = 100): string {
  const raw = c?.lastMessage?.content ?? "";
  const norm = String(raw).replace(/\s+/g, " ").trim();
  if (!norm) return "—";
  return norm.length > max ? norm.slice(0, max) + "…" : norm;
}

export default function ConversationsList({
  activeId,
  onSelect,
}: {
  activeId?: string | null;
  onSelect: (id: string) => void;
}) {
  const { user } = useAuth();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    status,
    error,
  } = useConversations(undefined, { enabled: !!user });

  const items = data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <div className="flex h-full flex-col">
      <div className="p-3 text-sm font-semibold flex items-center justify-between">
        <span>Conversations</span>
      </div>

      <div
        className="flex-1 overflow-auto divide-y"
        style={{ scrollbarGutter: "stable" }}
      >
        {status === "pending" && <div className="p-3 text-sm">Chargement…</div>}

        {status === "error" && (
          <div className="p-3 text-sm text-red-600">
            Erreur de chargement
            {(error as any)?.message ? ` : ${(error as any).message}` : ""}
          </div>
        )}

        {items.map((c: any, idx: number) => (
          <motion.button
            key={c.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18, delay: idx * 0.02 }}
            onClick={() => onSelect(c.id)}
            className={cn(
              "w-full text-left p-3 hover:bg-muted/60 focus:bg-muted/60 focus:outline-none flex items-center justify-between gap-3",
              activeId === c.id && "bg-muted"
            )}
            aria-current={activeId === c.id ? "page" : undefined}
          >
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">{toTitle(c)}</div>

              <div className="text-xs text-muted-foreground truncate">
                {toSnippet(c, 100)}
              </div>
            </div>

            {c.unreadCount > 0 && (
              <motion.span
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="ml-2 inline-flex items-center justify-center text-[11px] px-2 py-0.5 rounded-full bg-primary text-primary-foreground"
              >
                {c.unreadCount}
              </motion.span>
            )}
          </motion.button>
        ))}

        {status === "success" && items.length === 0 && (
          <div className="p-3 text-xs text-muted-foreground">
            Aucune conversation.
          </div>
        )}
      </div>

      {hasNextPage && (
        <div className="p-2">
          <Button
            className="w-full"
            variant="outline"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage ? "Chargement…" : "Charger plus"}
          </Button>
        </div>
      )}
    </div>
  );
}
