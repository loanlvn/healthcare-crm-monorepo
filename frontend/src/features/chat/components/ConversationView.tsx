/* eslint-disable @typescript-eslint/no-explicit-any */
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/ButtonUI";
import { RoleBadge } from "@/components/ui/RoleBadge";
import { useMessages, usePostMessage } from "../service/hooks2";
import { useAuth } from "@/store/auth";

interface ConversationViewProps {
  selected: string | null;
  conversation: any;
}

type RoleLike = 'ADMIN' | 'DOCTOR' | 'SECRETARY' | 'PATIENT';

function getConversationRole(c: any, currentUserId?: string): RoleLike {
  if (!c) return 'DOCTOR';
  if (c.type === 'PATIENT') return 'PATIENT';
  if (c.primaryRole) return c.primaryRole as RoleLike;

  const list = Array.isArray(c.participants) ? c.participants : [];
  const other = list.find((p: any) => p?.id && p.id !== currentUserId);
  const r = other?.role as RoleLike | undefined;
  return (r ?? 'DOCTOR');
}

export function ConversationView({ selected, conversation }: ConversationViewProps) {
  const { user } = useAuth();
  const msgs = useMessages(selected || "", 25);
  const post = usePostMessage(selected || "");

  if (!selected) {
    return (
      <Card variant="ghost" elevation={0} className="h-full flex items-center justify-center p-0 backdrop-blur-sm">
        <div className="text-center text-muted px-6">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.2 }}>
            <div className="text-lg font-semibold mb-1">👋</div>
            <p>Sélectionne une conversation</p>
          </motion.div>
        </div>
      </Card>
    );
  }

  const title =
    conversation?.type === "PATIENT" && conversation?.patient
      ? `${conversation.patient.firstName ?? ""} ${conversation.patient.lastName ?? ""}`.trim()
      : "Conversation interne";

  return (
    <Card variant="ghost" elevation={0} className="h-full flex flex-col p-0 backdrop-blur-sm">
      {/* Header compact et collant */}
      <div className="px-4 py-3 border-b border-token sticky top-0 z-10 bg-[color:color-mix(in_oklab,var(--surface)_92%,transparent)]">
        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
          <div className="min-w-0">
            <h3 className="font-semibold text-sm md:text-base truncate">{title}</h3>
            <div className="flex items-center gap-2 mt-1">
              <RoleBadge role={getConversationRole(conversation, user?.id)} />
              <span className="text-[11px] text-muted truncate">#{selected}</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Zone messages (ordre inverse), padding léger */}
      <div className="flex-1 min-h-0 overflow-y-auto px-3 md:px-4 py-3 flex flex-col-reverse gap-2">
        <AnimatePresence initial={false}>
          {/* Bouton "charger plus" en haut (logique avec flex-col-reverse) */}
          {msgs.hasNextPage && (
            <motion.div
              key="load-more"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="self-center my-1"
            >
              <Button
                variant="ghost"
                size="sm"
                onClick={() => msgs.fetchNextPage()}
                loading={msgs.isFetchingNextPage}
              >
                Charger plus de messages
              </Button>
            </motion.div>
          )}

          {msgs.data?.pages.flatMap((page, pIdx) =>
            page.items.map((message: any, i: number) => {
              const mine = message.senderId === user?.id;
              return (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.15, delay: Math.min((pIdx * 0.02) + (i * 0.01), 0.2) }}
                  className={[
                    "max-w-[72%] rounded-2xl px-3 py-2 border",
                    mine
                      ? "self-end border-transparent text-[color:var(--on-primary,white)] bg-[color:color-mix(in_oklab,var(--primary)_92%,transparent)]"
                      : "self-start border-token bg-[color:color-mix(in_oklab,var(--surface)_78%,transparent)]",
                  ].join(" ")}
                >
                  <div className="text-sm whitespace-pre-wrap break-words">{message.content}</div>
                  <div className={["text-[11px] mt-1", mine ? "opacity-75" : "text-muted"].join(" ")}>
                    {new Date(message.createdAt).toLocaleString()}
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>

      {/* Composer compact, fond translucide et bord supérieur */}
      <form
        className="border-t border-token bg-[color:color-mix(in_oklab,var(--surface)_92%,transparent)] px-3 md:px-4 py-3"
        onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          const content = String(formData.get("content") || "").trim();
          if (content) {
            post.mutate({ content });
            (e.currentTarget as HTMLFormElement).reset();
          }
        }}
      >
        <div className="flex gap-2">
          <input
            name="content"
            className="flex-1 input rounded-xl"
            placeholder="Écrire un message…"
            disabled={post.isPending}
            autoComplete="off"
          />
          <Button type="submit" loading={post.isPending} disabled={post.isPending}>
            Envoyer
          </Button>
        </div>
      </form>
    </Card>
  );
}
