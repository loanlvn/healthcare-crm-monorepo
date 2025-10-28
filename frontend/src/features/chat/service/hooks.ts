/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type {
  Attachment,
  ConversationItem,
  CursorPage,
  MessageItem,
} from "../../../lib/types";
import {
  createConversation,
  fetchConversation,
  fetchConversations,
  fetchMessages,
  fetchUnreadSummary,
  markRead,
  sendMessage,
} from "./serviceChat";

// Keys
const K = {
  convs: (f: any) => ["chat:conversations", f] as const,
  conv: (id?: string) => ["chat:conversation", id] as const,
  msgs: (id?: string) => ["chat:messages", id] as const,
  unread: ["chat:unread"] as const,
};

export function useConversations(
  filters?: {
    q?: string;
    type?: "INTERNAL" | "PATIENT";
    patientId?: string;
    pageSize?: number;
  },
  opt?: { enabled?: boolean }
) {
  return useInfiniteQuery({
    queryKey: K.convs(filters ?? {}),
    enabled: opt?.enabled ?? true,
    queryFn: ({ pageParam }) =>
      fetchConversations({
        ...filters,
        cursor: pageParam as string | undefined,
      }),
    getNextPageParam: (last) => last.nextCursor,
    initialPageParam: undefined as string | undefined,
  });
}

export function useConversationMeta(id?: string) {
  return useQuery({
    queryKey: K.conv(id),
    enabled: !!id,
    queryFn: () => fetchConversation(id!),
    staleTime: 10_000,
  });
}

export function useMessages(conversationId?: string, pageSize = 30) {
  return useInfiniteQuery({
    queryKey: K.msgs(conversationId),
    enabled: !!conversationId,
    queryFn: ({ pageParam }) =>
      fetchMessages(conversationId!, {
        cursor: pageParam as string | undefined,
        pageSize,
        direction: "back",
      }),
    getNextPageParam: (last) => last.nextCursor,
    initialPageParam: undefined as string | undefined,
  });
}

export function useSendMessage(conversationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      content: string;
      type?: "NOTE" | "ALERT" | "REMINDER";
      attachments?: Attachment[];
    }) => sendMessage(conversationId, body),
    onSuccess: (msg) => {
      // 1) injecter le nouveau message dans le cache des messages (dernier groupe)
      qc.setQueryData(K.msgs(conversationId), (old: any) => {
        if (!old) return old;
        const pages = [...old.pages];
        if (pages.length === 0) return old;
        const lastIdx = pages.length - 1;
        const last = pages[lastIdx];
        const items = [...(last.items ?? []), msg];
        pages[lastIdx] = { ...last, items };
        return { ...old, pages };
      });
      // 2) bump conversation (lastMessage, updatedAt)
      qc.setQueryData(K.convs({}), (old: any) => {
        if (!old) return old;
        const pages = old.pages?.map((p: CursorPage<ConversationItem>) => ({
          ...p,
          items: p.items.map((c) =>
            c.id === msg.conversationId
              ? { ...c, lastMessage: msg, updatedAt: msg.createdAt }
              : c
          ),
        }));
        return { ...old, pages };
      });
      // 3) invalider le meta de la conversation (pour compteur/unread côté serveur)
      qc.invalidateQueries({ queryKey: K.conv(conversationId) });
    },
  });
}

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (messageId: string) => markRead(messageId),
    onSuccess: (_, messageId) => {
      // mettre à jour le readAt localement
      const patch = (data: any) => {
        if (!data) return data;
        const pages = data.pages?.map((p: any) => ({
          ...p,
          items: p.items.map((m: MessageItem) =>
            m.id === messageId
              ? {
                  ...m,
                  receipt: {
                    ...(m.receipt ?? {}),
                    readAt: new Date().toISOString(),
                  },
                }
              : m
          ),
        }));
        return { ...data, pages };
      };
      // toutes les conversations potentiellement
      qc.setQueriesData({ queryKey: ["chat:messages"] }, patch);
      // résumé unread
      qc.invalidateQueries({ queryKey: K.unread });
    },
  });
}

export function useCreateConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createConversation,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chat:conversations"] });
    },
  });
}

export function useUnreadSummary(opt?: { enabled?: boolean; staleTime?: number }) {
   return useQuery({
    queryKey: K.unread,
    queryFn: fetchUnreadSummary,
    enabled: opt?.enabled ?? true,
    staleTime: opt?.staleTime ?? 5_000,
  });
}
