/* eslint-disable @typescript-eslint/no-explicit-any */
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { RoleBadge } from "@/components/ui/RoleBadge";

interface ConversationListProps {
  conversations: any[];
  selected: string | null;
  onSelect: (id: string) => void;
  unreadCount: number;
  hasNextPage: boolean;
  onLoadMore: () => void;
}

export function ConversationList({
  conversations,
  selected,
  onSelect,
  unreadCount,
  hasNextPage,
  onLoadMore,
}: ConversationListProps) {
  return (
    <Card variant="ghost" elevation={0} className="h-full flex flex-col p-0 backdrop-blur-sm">

      {/* Header compact */}
      <div className="px-4 py-3 border-b border-token flex items-center justify-between">
        <h2 className="font-semibold text-sm uppercase tracking-wide">Conversations</h2>
        <motion.span
          key={unreadCount}
          initial={{ scale: 1.3 }}
          animate={{ scale: 1 }}
          className="text-primary font-medium text-sm"
        >
          {unreadCount}
        </motion.span>
      </div>

      {/* Liste */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence initial={false}>
          {conversations.map((c, i) => {
            const active = selected === c.id;
            return (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                transition={{ duration: 0.15, delay: i * 0.03 }}
              >
                <div
                  onClick={() => onSelect(c.id)}
                  className={[
                    "px-4 py-3 cursor-pointer flex flex-col border-b border-token/50 transition",
                    active
                      ? "bg-[color:color-mix(in_oklab,var(--surface)_90%,transparent)]"
                      : "hover:bg-[color:color-mix(in_oklab,var(--surface)_70%,transparent)]",
                  ].join(" ")}
                >
                  <div className="flex items-center gap-2">
                    <RoleBadge role={c.primaryRole ?? (c.type === "PATIENT" ? "PATIENT" : "DOCTOR")} />
                    <span className="font-medium truncate flex-1">{c.displayName}</span>

                    {c.unreadCount > 0 && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="bg-danger text-white text-xs rounded-full px-2 py-0.5"
                      >
                        {c.unreadCount}
                      </motion.span>
                    )}
                  </div>

                  {c.lastMessagePreview && (
                    <span className="text-xs text-muted truncate mt-0.5">
                      {c.lastMessagePreview}
                    </span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {hasNextPage && (
          <button
            onClick={onLoadMore}
            className="w-full text-center text-xs py-3 text-muted hover:text-foreground transition"
          >
            Charger plus
          </button>
        )}
      </div>
    </Card>
  );
}
