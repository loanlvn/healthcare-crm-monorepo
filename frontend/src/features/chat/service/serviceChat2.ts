/* eslint-disable @typescript-eslint/no-explicit-any */
import { api } from '@/lib/api';
import type { PageCursor, Conversation, ConversationType, Message, MsgType, User } from '@/lib/types';

const BASE = 'conversations';

export type ListConversationsQuery = {
  pageSize?: number;
  cursor?: string | null; 
  type?: ConversationType; 
  patientId?: string; 
};

export async function listConversations(q: ListConversationsQuery) {
  const sp: Record<string, any> = {};
  if (q.pageSize) sp.pageSize = q.pageSize;
  if (q.cursor) sp.cursor = q.cursor;
  if (q.type) sp.type = q.type;
  if (q.patientId) sp.patientId = q.patientId;
  return api.get(BASE, { searchParams: sp }).json<PageCursor<Conversation>>();
}

export async function getConversation(id: string) {
  return api.get(`${BASE}/${id}`).json<Conversation>();
}

export async function addParticipants(id: string, add: string[]) {
  return api.post(`${BASE}/${id}/participants`, { json: { add } }).json<{ added: number }>();
}

export type ListMessagesQuery = { pageSize?: number; cursor?: string | null };
export async function listMessages(conversationId: string, q: ListMessagesQuery) {
  const sp: Record<string, any> = {};
  if (q.pageSize) sp.pageSize = q.pageSize;
  if (q.cursor) sp.cursor = q.cursor;
  return api.get(`${BASE}/${conversationId}/messages`, { searchParams: sp }).json<PageCursor<Message>>();
}

export async function postMessage(conversationId: string, payload: { content: string; type?: MsgType; attachments?: unknown }) {
  return api.post(`${BASE}/${conversationId}/messages`, { json: payload }).json<Message>();
}

export async function markMessageRead(messageId: string) {
  return api.post(`${BASE}/messages/${messageId}/read`).json<{ messageId: string; readAt: string }>();
}

export async function unreadSummary() {
  return api.get(`${BASE}/me/unread-count`).json<{ total: number; byConversation: { conversationId: string; count: number }[] }>();
}

export async function sendDirect(toUserId: string, content: string, type: MsgType = 'NOTE') {
  return api.post(`${BASE}/messages/direct`, { json: { toUserId, content, type } }).json<Message>();
}

export async function directoryUsers(params: { q?: string; role?: 'DOCTOR' | 'SECRETARY' | 'ADMIN'; page?: number; limit?: number }) {
  return api.get(`${BASE}/directory`, { searchParams: params }).json<{ items: User[]; page: number; limit: number; total: number }>();
}

export async function createConversation(dto: {
  type: ConversationType;
  participantIds?: string[]; 
  patientId?: string;
}) {
  return api.post(`${BASE}`, { json: { participantIds: dto.participantIds ?? [], type: dto.type, patientId: dto.patientId } })
           .json<{ id: string }>();
}