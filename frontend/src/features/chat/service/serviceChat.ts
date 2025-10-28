/* eslint-disable @typescript-eslint/no-explicit-any */
import { api } from "@/lib/api";
import type {
  Attachment,
  ConversationItem,
  CursorPage,
  DirectoryUser,
  MessageItem,
  UnreadSummary,
} from "../../../lib/types";

/* -------------------- helpers searchParams -------------------- */
function cleanParams<T extends Record<string, any>>(obj?: T): Record<string, any> | undefined {
  if (!obj) return undefined;
  const out = Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined && v !== null && v !== "")
  );
  return Object.keys(out).length ? out : undefined;
}

/* -------------------------- Conversations -------------------------- */
export function fetchConversations(params: {
  cursor?: string;
  pageSize?: number;
  q?: string;
  type?: "INTERNAL" | "PATIENT";
  patientId?: string;
}) {
  const searchParams = cleanParams(params);
  const opts: any = {};
  if (searchParams) opts.searchParams = searchParams;
  return api.get("conversations", opts).json<CursorPage<ConversationItem>>();
}

export function fetchConversation(id: string) {
  return api.get(`conversations/${id}`).json<ConversationItem>();
}

export function createConversation(body: {
  type: "INTERNAL" | "PATIENT";
  participantIds?: string[];
  patientId?: string;
}) {
  return api.post("conversations", { json: body }).json<{ id: string }>();
}

/* ---------------------------- Messages ---------------------------- */
export function fetchMessages(
  conversationId: string,
  params: { cursor?: string; pageSize?: number; direction?: "back" | "fwd" } = {}
) {
  const searchParams = cleanParams(params);
  const opts: any = {};
  if (searchParams) opts.searchParams = searchParams;
  return api
    .get(`conversations/${conversationId}/messages`, opts)
    .json<CursorPage<MessageItem>>();
}

export function sendMessage(
  conversationId: string,
  body: { content: string; type?: "NOTE" | "ALERT" | "REMINDER"; attachments?: Attachment[] }
) {
  return api.post(`conversations/${conversationId}/messages`, { json: body }).json<MessageItem>();
}

export function markRead(messageId: string) {
  return api.post(`conversations/messages/${messageId}/read`).json<{ ok: true }>();
}

/* ---------------------- Directory / Unread ---------------------- */
export function fetchChatDirectory(params: {
  q?: string;
  role?: "DOCTOR" | "SECRETARY";
  page?: number;
  limit?: number;
}) {
  // Pour le directory, on garde "limit" car directoryQuerySchema l'attend
  const searchParams = cleanParams(params);
  const opts: any = {};
  if (searchParams) opts.searchParams = searchParams;
  return api
    .get("conversations/directory", opts)
    .json<{ items: DirectoryUser[]; total: number; page: number; limit: number }>();
}

export function fetchUnreadSummary() {
  return api.get("conversations/me/unread-count").json<UnreadSummary>();
}