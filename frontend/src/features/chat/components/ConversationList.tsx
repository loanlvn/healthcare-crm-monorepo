/* eslint-disable @typescript-eslint/no-explicit-any */
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/ButtonUI';
import { RoleBadge } from '@/components/ui/RoleBadge';

interface ConversationListProps {
  conversations: any[]; // <- NormalizedConversation[]
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
    <Card className="h-full flex flex-col">
      {/* Header */}
      <div className="pb-4 border-b border-token">
        <h2 className="font-semibold text-lg mb-2">Conversations</h2>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted">Non lus:</span>
          <motion.span key={unreadCount} initial={{ scale: 1.2 }} animate={{ scale: 1 }} className="font-semibold text-primary">
            {unreadCount}
          </motion.span>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-auto py-2">
        <AnimatePresence>
          {conversations.map((conversation, index) => (
            <motion.div
              key={conversation.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ delay: index * 0.05 }}
            >
              <Button
                variant={selected === conversation.id ? 'primary' : 'ghost'}
                fullWidth
                className="justify-start mb-2 h-auto py-3 px-4"
                onClick={() => onSelect(conversation.id)}
              >
                <div className="flex flex-col items-start text-left w-full">
                  <div className="flex items-center gap-2 w-full mb-1">
                    <RoleBadge role={conversation.primaryRole ?? (conversation.type === 'PATIENT' ? 'PATIENT' : 'DOCTOR')} />
                    <span className="flex-1 truncate font-medium">
                      {conversation.displayName}
                    </span>
                    {conversation.unreadCount > 0 && (
                      <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="bg-danger text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                        {conversation.unreadCount}
                      </motion.span>
                    )}
                  </div>

                  {conversation.lastMessagePreview && (
                    <p className="text-xs text-muted truncate w-full">
                      {conversation.lastMessagePreview}
                    </p>
                  )}
                </div>
              </Button>
            </motion.div>
          ))}
        </AnimatePresence>

        {hasNextPage && (
          <div className="pt-2">
            <Button variant="outline" fullWidth onClick={onLoadMore}>
              Charger plus
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
