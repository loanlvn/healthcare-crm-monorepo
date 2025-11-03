// features/chat/components/Composer.tsx
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/ButtonUI";
import { cn } from "@/lib/cn";
import { usePostMessage } from "../../features/chat/service/hooks2"; 

type Props = {
  conversationId: string;
  disabled?: boolean;
};

export default function Composer({ conversationId, disabled }: Props) {
  const [content, setContent] = useState("");
  const areaRef = useRef<HTMLTextAreaElement | null>(null);
  const post = usePostMessage(conversationId); // v2

  function send() {
    const text = content.trim();
    if (!text || disabled) return;
    post.mutate(
      { content: text },
      {
        onSuccess: () => setContent(""),
      }
    );
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    send();
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Ctrl/Cmd + Enter => envoyer
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      send();
    }
  }

  // autosize simple (max 160px)
  useEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  }, [content]);

  const isDisabled = disabled || post.isPending;

  return (
    <form
      onSubmit={onSubmit}
      className="border-t border-token bg-[color:color-mix(in_oklab,var(--surface)_92%,transparent)] px-3 md:px-4 py-3"
    >
      <div className="flex items-end gap-2">
        <textarea
          ref={areaRef}
          className={cn(
            "input w-full min-h-[42px] max-h-[160px] resize-none rounded-xl",
            isDisabled && "opacity-60 cursor-not-allowed"
          )}
          placeholder={disabled ? "Lecture seule" : "Écrire un message…"}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={onKeyDown}
          disabled={isDisabled}
          rows={1}
          autoComplete="off"
          aria-label="Composer un message"
        />
        <Button type="submit" disabled={isDisabled} loading={post.isPending}>
          Envoyer
        </Button>
      </div>
      <div className="mt-1 text-[11px] text-muted">Raccourci : ⌘/Ctrl + Entrée</div>
    </form>
  );
}
