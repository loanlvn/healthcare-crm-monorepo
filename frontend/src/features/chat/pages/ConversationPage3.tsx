import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  useConversations,
  useConversation,
  useUnreadSummary,
  useEnsureConversation,
} from '../service/hooks2';
import { ConversationList } from '../components/ConversationList';
import { ConversationView } from '../components/ConversationView';
import { CreateConversationForm } from '../components/ConversationForm';

export default function ConversationsPage() {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);

  // Data hooks
  const conversations = useConversations({ pageSize: 20 });
  const unreadSummary = useUnreadSummary();
  const selectedConversation = useConversation(selectedConversationId || '');
  const { ensureInternal, ensurePatient, state: ensureState } = useEnsureConversation();

  // Flatten conversations
  const flattenedConversations = conversations.data?.pages.flatMap(page => page.items) || [];

  const handleCreateConversation = async (
    type: 'INTERNAL' | 'PATIENT',
    patientId: string,
    participantIds: string[]
  ) => {
    try {
      let result;
      if (type === 'PATIENT') {
        result = await ensurePatient(patientId, participantIds);
      } else {
        result = await ensureInternal(participantIds);
      }
      setSelectedConversationId(result.id);
    } catch (error) {
      console.error('Error creating conversation:', error);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-7xl mx-auto"
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-3rem)]">
          {/* Left Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              <CreateConversationForm
                onCreate={handleCreateConversation}
                isCreating={ensureState.isPending}
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="h-full"
            >
              <ConversationList
                conversations={flattenedConversations}
                selected={selectedConversationId}
                onSelect={setSelectedConversationId}
                unreadCount={unreadSummary.data?.total || 0}
                hasNextPage={conversations.hasNextPage || false}
                onLoadMore={() => conversations.fetchNextPage()}
              />
            </motion.div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="h-full"
            >
              <ConversationView
                selected={selectedConversationId}
                conversation={selectedConversation.data}
              />
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}