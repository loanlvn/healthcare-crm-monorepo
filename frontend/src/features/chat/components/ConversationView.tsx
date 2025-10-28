/* eslint-disable @typescript-eslint/no-explicit-any */
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/ButtonUI';
import { RoleBadge } from '@/components/ui/RoleBadge';
import { useMessages, usePostMessage } from '../service/hooks2';
import { useAuth } from '@/store/auth';

interface ConversationViewProps {
  selected: string | null;
  conversation: any;
}

export function ConversationView({ selected, conversation }: ConversationViewProps) {
  const { user } = useAuth();
  const msgs = useMessages(selected || '', 25);
  const post = usePostMessage(selected || '');

  if (!selected) {
    return (
      <Card className="h-full flex items-center justify-center">
        <div className="text-center text-muted">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <div className="text-lg font-semibold mb-2">👋</div>
            <p>Sélectionnez une conversation</p>
          </motion.div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      {/* Header */}
      <div className="pb-4 border-b border-token">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <h3 className="font-semibold text-lg">
              {conversation?.type === 'PATIENT' && conversation?.patient
                ? `${conversation.patient.firstName} ${conversation.patient.lastName}`
                : 'Conversation Interne'}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <RoleBadge role={conversation?.type === 'PATIENT' ? 'PATIENT' : 'DOCTOR'} />
              <span className="text-xs text-muted">#{selected}</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-hidden flex flex-col-reverse min-h-0">
        <div className="overflow-auto">
          <AnimatePresence>
            {msgs.data?.pages.flatMap((page) =>
              page.items.map((message, index) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.05 }}
                  className={`p-3 rounded-lg mb-2 max-w-[80%] ${
                    message.senderId === user?.id
                      ? 'bg-primary text-white ml-auto'
                      : 'bg-surface border border-token'
                  }`}
                >
                  <div className="text-sm">{message.content}</div>
                  <div
                    className={`text-xs mt-1 ${
                      message.senderId === user?.id ? 'text-white/70' : 'text-muted'
                    }`}
                  >
                    {new Date(message.createdAt).toLocaleString()}
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>

          {msgs.hasNextPage && (
            <div className="text-center py-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => msgs.fetchNextPage()}
                loading={msgs.isFetchingNextPage}
              >
                Charger plus de messages
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Input */}
      <form
        className="pt-4 border-t border-token"
        onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          const content = String(formData.get('content') || '').trim();
          if (content) {
            post.mutate({ content });
            (e.currentTarget as HTMLFormElement).reset();
          }
        }}
      >
        <div className="flex gap-2">
          <input
            name="content"
            className="flex-1 input"
            placeholder="Écrire un message..."
            disabled={post.isPending}
          />
          <Button
            type="submit"
            loading={post.isPending}
            disabled={post.isPending}
          >
            Envoyer
          </Button>
        </div>
      </form>
    </Card>
  );
}