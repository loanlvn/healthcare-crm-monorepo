/* eslint-disable @typescript-eslint/no-explicit-any */
// src/features/chat/service/hooks2.ts
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  directoryUsers,
  getConversation,
  listConversations,
  listMessages,
  markMessageRead,
  postMessage,
  unreadSummary,
  createConversation,
} from './serviceChat2';

// imports en tête de fichier
import type { PageCursor, Conversation } from '@/lib/types';

/* ---------------- NORMALISATION ---------------- */
type Any = Record<string, any>;

const safeName = (x?: string) => (x ?? '').trim();
const joinName = (fn?: string, ln?: string) =>
  [safeName(fn), safeName(ln)].filter(Boolean).join(' ').trim();

function unwrapUser(p: Any | null | undefined) {
  if (!p) return null;
  const raw = (p as any).user ?? p;
  return {
    ...raw,
    firstName: raw?.firstName ?? raw?.firstname ?? raw?.givenName ?? '',
    lastName:  raw?.lastName  ?? raw?.lastname  ?? raw?.familyName ?? '',
    role:      (p as any)?.role ?? raw?.role ?? null,
    id:        raw?.id ?? raw?.userId ?? (p as any)?.userId ?? null,
  };
}

export type NormalizedConversation = Conversation & {
  // participants normalisés
  participants: Array<Any & { user: ReturnType<typeof unwrapUser> }>;
  // labels prêts à afficher
  displayName: string;
  participantNames?: string;
  primaryRole?: string | null;
  patient: (Conversation['patient'] & { firstName?: string; lastName?: string }) | null;
};

function computeDisplay(c: Any): Pick<NormalizedConversation, 'displayName'|'participantNames'|'primaryRole'> {
  // Patient
  if (c?.type === 'PATIENT' && c?.patient) {
    const displayName = joinName(c.patient.firstName, c.patient.lastName) || 'Patient';
    return { displayName, participantNames: undefined, primaryRole: 'PATIENT' };
  }

  // Interne
  const labels = (c?.participants ?? [])
    .map((p: Any) => {
      const u = (p && p.user) ? p.user : unwrapUser(p);
      return u ? joinName(u.firstName, u.lastName) : '';
    })
    .filter(Boolean);

  const participantNames =
    labels.length ? labels.join(', ') :
    c?.participantNames ? String(c.participantNames) :
    (Array.isArray(c?.participantUserIds) ? `${c.participantUserIds.length} participant(s)` : '');

  const displayName = participantNames || 'Conversation Interne';
  const primaryRole =
    (c?.participants?.[0]?.role) ??
    (c?.participants?.[0]?.user?.role) ?? null;

  return { displayName, participantNames, primaryRole };
}

function normalizeConversation(conv: Conversation): NormalizedConversation {
  const participants = (conv?.participants ?? []).map((p: Any) => {
    const user = unwrapUser(p);
    return { ...p, user, role: p?.role ?? user?.role ?? null };
  });

  const patient = conv?.patient
    ? { ...conv.patient, firstName: conv.patient.firstName ?? '', lastName: conv.patient.lastName ?? '' }
    : null;

  const computed = computeDisplay({ ...conv, participants, patient });

  return { ...conv, participants, patient, ...computed } as unknown as NormalizedConversation;
}

function normalizePage(page: PageCursor<Conversation>): PageCursor<NormalizedConversation> {
  return {
    ...page, // conserve nextCursor, etc.
    items: (page.items ?? []).map(normalizeConversation),
  };
}
/* -------------- FIN NORMALISATION -------------- */


export function useConversations(q: { type?: 'INTERNAL' | 'PATIENT'; patientId?: string; pageSize?: number } = {}) {
  return useInfiniteQuery({
    queryKey: ['chat','conversations', q],
    queryFn: async ({ pageParam }) => {
      const res = await listConversations({ ...q, cursor: pageParam ?? null }); 
      return normalizePage(res); 
    },
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    initialPageParam: null as string | null,
    staleTime: 30_000,
  });
}

export function useConversation(id: string) {
  return useQuery({
    queryKey: ['chat','conversation', id],
    queryFn: async () => normalizeConversation(await getConversation(id)),
    enabled: !!id,
    staleTime: 30_000,
  });
}


export function useMessages(conversationId: string, pageSize = 20) {
  return useInfiniteQuery({
    queryKey: ['chat','messages', conversationId, pageSize],
    queryFn: ({ pageParam }) => listMessages(conversationId, { pageSize, cursor: pageParam ?? null }),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled: !!conversationId,
    initialPageParam: null as string | null,
  });
}

export function usePostMessage(conversationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: { content: string; type?: 'NOTE'|'ALERT'|'REMINDER' }) => postMessage(conversationId, p),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chat','messages', conversationId] });
      qc.invalidateQueries({ queryKey: ['chat','conversations'] });
      qc.invalidateQueries({ queryKey: ['chat','unread'] });
    },
  });
}

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (messageId: string) => markMessageRead(messageId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chat','conversations'] });
      qc.invalidateQueries({ queryKey: ['chat','unread'] });
    },
  });
}

export function useUnreadSummary(opts?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['chat','unread'],
    queryFn: unreadSummary,
    enabled: opts?.enabled ?? true,
    staleTime: 30_000,
  });
}

export function useDirectory(params: { q?: string; role?: 'DOCTOR' | 'SECRETARY' | 'ADMIN'; page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['chat','directory', params],
    queryFn: () => directoryUsers(params),
    staleTime: 30_000,
  });
}

/** NEW: create (dé-dupliqué côté back) */
export function useCreateConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: { type: 'INTERNAL'|'PATIENT'; participantIds?: string[]; patientId?: string }) => createConversation(dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chat','conversations'] });
    },
  });
}

/** NEW: helpers ergonomiques */
export function useEnsureConversation() {
  const m = useCreateConversation();
  return {
    ensureInternal: (participantIds: string[]) => m.mutateAsync({ type: 'INTERNAL', participantIds }),
    ensurePatient: (patientId: string, participantIds: string[] = []) => m.mutateAsync({ type: 'PATIENT', patientId, participantIds }),
    state: m,
  };
}
