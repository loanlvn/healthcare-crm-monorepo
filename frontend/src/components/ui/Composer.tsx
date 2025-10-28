import { useState } from 'react';
import { useSendMessage } from '../../features/chat/service/hooks';
import { Button } from '@/components/ui/ButtonUI';
import { cn } from '../../lib/cn';

export default function Composer({
  conversationId,
  disabled,
}: {
  conversationId: string;
  disabled?: boolean;
}) {
  const [content, setContent] = useState('');
  const send = useSendMessage(conversationId);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = content.trim();
    if (!text) return;
    send.mutate({ content: text }, { onSuccess: () => setContent('') });
  }

  return (
    <form onSubmit={onSubmit} className="border-t p-2 flex items-end gap-2">
      <textarea
        className={cn(
          'input w-full min-h-[42px] max-h-[160px] resize-y',
          disabled && 'opacity-60 cursor-not-allowed'
        )}
        placeholder={disabled ? 'Lecture seule' : 'Écrire un message…'}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        disabled={disabled || send.isPending}
      />
      <Button type="submit" disabled={disabled || send.isPending}>
        Envoyer
      </Button>
    </form>
  );
}
