// src/features/chat/pages/ChatPage.tsx
import { useMemo, useState } from "react";
import ConversationsList from "../../../components/ui/ConversationList";
import MessagesPane from "../../../components/ui/MessagePane";
import Composer from "../../../components/ui/Composer";
import { useConversationMeta } from "../service/hooks";
import { useAuth } from "@/store/auth";
import QuickDirect from "../../../components/ui/QuickDirect";
import NewConversationSheet from "../../chat/pages/NewConversationPage"; // ⬅️ le nouveau composant “sheet”

export default function ChatPage() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [openNew, setOpenNew] = useState(false); // ⬅️ état d’ouverture du sheet
  const { user } = useAuth();
  const { data: convMeta } = useConversationMeta(activeId ?? undefined);

  const isPatientConv = convMeta?.type === "PATIENT";
  const patientOwnerId = convMeta?.patient?.ownerId as string | undefined;

  const composerDisabled =
    !activeId ||
    (isPatientConv &&
      user?.role !== "ADMIN" &&
      (user?.role !== "DOCTOR" || user?.id !== patientOwnerId));

  const rightTitle = useMemo(() => {
    if (!convMeta) return "Aucune conversation";
    if (convMeta.type === "PATIENT") {
      const p = convMeta.patient;
      return p ? `Patient · ${p.firstName} ${p.lastName}` : "Patient";
    }
    return "Conversation interne";
  }, [convMeta]);

  return (
    <div className="grid grid-cols-[340px_1fr] h-full">
      {/* --- Sidebar --- */}
      <aside
        className="relative border-r surface"
        style={{ overflow: openNew ? "hidden" : undefined }}
      >
        {/* Header sticky */}
        <div className="sticky top-0 z-10 border-b bg-background/85 backdrop-blur px-3 py-2">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold tracking-tight">
              Conversations
            </div>
            {/* Bouton qui ouvre le sheet */}
            <button
              className="btn btn-outline"
              onClick={() => setOpenNew(true)}
            >
              Nouveau
            </button>
          </div>
        </div>

        {/* Liste scrollable */}
        <div
          className="h-full overflow-auto px-2 py-2 pb-[84px]"
          style={{ scrollbarGutter: "stable" }}
        >
          <div className="rounded-xl border bg-background shadow-sm">
            <ConversationsList activeId={activeId} onSelect={setActiveId} />
          </div>
        </div>

        {/* Footer sticky : QuickDirect */}
        <div className="sticky bottom-0 z-10 border-t bg-background/90 backdrop-blur px-3 py-2">
          <QuickDirect onOpenConversation={(id: string) => setActiveId(id)} />
          <div className="mt-1 text-[10px] text-muted select-none">
            Astuce : ↑/↓ pour naviguer, Entrée pour ouvrir
          </div>
        </div>

        {/* Sheet ancré à la sidebar */}
        <NewConversationSheet
          open={openNew} // ⬅️ PROPS requis
          onClose={() => setOpenNew(false)} // ⬅️ PROPS requis
          onCreated={(id) => {
            // ⬅️ sélectionne la conv créée
            setActiveId(id);
            setOpenNew(false);
          }}
        />
      </aside>

      {/* --- Pane messages --- */}
      <section className="flex flex-col min-w-0">
        <div className="sticky top-0 z-10 border-b bg-background/85 backdrop-blur px-4 py-2">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold tracking-tight truncate">
              {rightTitle}
            </h2>
            {activeId && (
              <div className="text-[11px] text-muted">
                ID : <span className="opacity-80">{activeId.slice(0, 8)}…</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 min-h-0 flex flex-col">
          {activeId ? (
            <>
              <MessagesPane
                conversationId={activeId}
                currentUserId={user!.id}
              />
                <Composer
                  conversationId={activeId}
                  disabled={composerDisabled}
                />
            </>
          ) : (
            <EmptyState />
          )}
        </div>
      </section>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex-1 grid place-items-center">
      <div className="text-center max-w-sm px-6 py-10 border rounded-2xl bg-background shadow-sm">
        <div
          className="mx-auto mb-3 h-14 w-14 rounded-2xl grid place-items-center"
          style={{
            background: "color-mix(in oklab, var(--primary) 15%, transparent)",
            color: "var(--primary)",
          }}
        >
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden
          >
            <path
              d="M4 5h16v9H7l-3 3V5z"
              stroke="currentColor"
              strokeWidth="1.5"
            />
          </svg>
        </div>
        <div className="text-sm font-semibold">
          Aucune conversation sélectionnée
        </div>
        <div className="text-xs text-muted mt-1">
          Choisis une conversation à gauche, ou crée-en une nouvelle.
        </div>
      </div>
    </div>
  );
}
