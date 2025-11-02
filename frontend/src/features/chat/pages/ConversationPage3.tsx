import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  useConversations,
  useConversation,
  useUnreadSummary,
  useEnsureConversation,
} from "../service/hooks2";
import { ConversationList } from "../components/ConversationList";
import { ConversationView } from "../components/ConversationView";
import { CreateConversationForm } from "../components/ConversationForm";

export default function ConversationsPage() {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);

  // Data hooks
  const conversations = useConversations({ pageSize: 20 });
  const unreadSummary = useUnreadSummary();
  const selectedConversation = useConversation(selectedConversationId || "");
  const { ensureInternal, ensurePatient, state: ensureState } = useEnsureConversation();

  // Flatten + memo pour éviter les recalculs
  const flattenedConversations = useMemo(
    () => conversations.data?.pages.flatMap((page) => page.items) || [],
    [conversations.data]
  );

  // ✅ Auto-select : 1ère conversation lorsqu'on a des données et rien de sélectionné
  useEffect(() => {
    if (!selectedConversationId && flattenedConversations.length > 0) {
      setSelectedConversationId(flattenedConversations[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flattenedConversations.length]);

  const handleCreateConversation = async (
    type: "INTERNAL" | "PATIENT",
    patientId: string,
    participantIds: string[]
  ) => {
    try {
      const result =
        type === "PATIENT"
          ? await ensurePatient(patientId, participantIds)
          : await ensureInternal(participantIds);
      setSelectedConversationId(result.id);
    } catch (error) {
      console.error("Error creating conversation:", error);
    }
  };

  return (
    <div className="h-[calc(100vh-3rem)] bg-background px-4 md:px-6 py-4 md:py-6">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="max-w-7xl mx-auto h-full">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 h-full min-h-0">
          {/* Colonne gauche : min-h-0 pour que la liste ne pousse pas l'ensemble */}
          <div className="lg:col-span-1 min-h-0 flex flex-col gap-4 md:gap-6">
            {/* Formulaire (auto-height) */}
            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
              <CreateConversationForm onCreate={handleCreateConversation} isCreating={ensureState.isPending} />
            </motion.div>

            {/* Liste (prend tout le reste) */}
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.08 }}
              className="flex-1 min-h-0"
            >
              <div className="h-full min-h-0">
                <ConversationList
                  conversations={flattenedConversations}
                  selected={selectedConversationId}
                  onSelect={setSelectedConversationId}
                  unreadCount={unreadSummary.data?.total || 0}
                  hasNextPage={conversations.hasNextPage || false}
                  onLoadMore={() => conversations.fetchNextPage()}
                />
              </div>
            </motion.div>
          </div>

          {/* Colonne droite : vue conversation pleine hauteur */}
          <div className="lg:col-span-2 min-h-0">
            <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.12 }} className="h-full min-h-0">
              <ConversationView selected={selectedConversationId} conversation={selectedConversation.data} />
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
