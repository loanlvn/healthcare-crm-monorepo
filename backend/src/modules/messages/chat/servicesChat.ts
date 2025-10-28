import { Role, Prisma, ConversationType, MsgType } from "@prisma/client";
import { AppError, forbidden } from "../../../utils/appError";
import { prisma } from "../../../infra/prisma";
import type { DirectoryQuery } from "./dto";

// --------- helpers cursor ----------
type Cursor = { createdAt: string; id: string };

function isAdmin(role: Role) {
  return role === "ADMIN";
}

export async function ensureParticipantOrAdmin(
  conversationId: string,
  userId: string,
  role: Role
) {
  if (isAdmin(role)) return;
  const part = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
    select: { userId: true },
  });
  if (!part) throw forbidden("NOT_PARTICIPANT");
}

export async function ensureDoctorOwnsPatientOrAdmin(
  userId: string,
  role: Role,
  patientId: string
) {
  if (role === "ADMIN") return; // admin bypass
  if (role !== "DOCTOR") throw new AppError(403, "DOCTOR_REQUIRED");

  const owned = await prisma.patient.findFirst({
    where: {
      id: patientId,
      OR: [
        { ownerId: userId },
        { doctors: { some: { doctorId: userId } } }, // table PatientDoctor (m2m)
      ],
    },
    select: { id: true },
  });
  if (!owned) throw new AppError(403, "NOT_PATIENT_OWNER");
}

// --------- guards ----------
export async function assertParticipant(
  conversationId: string,
  userId: string
) {
  const exists = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
    select: { conversationId: true },
  });
  if (!exists) throw new AppError(403, "NOT_PARTICIPANT");
}

// --------- service API ----------
export const ChatService = {
  async createConversation(
    currentUser: { id: string; role: Role },
    body: {
      type: "PATIENT" | "INTERNAL";
      patientId?: string;
      participantIds: string[];
    }
  ) {
    const participantIds = Array.from(
      new Set([currentUser.id, ...(body.participantIds ?? [])])
    );

    // service ChatService.createConversation (remplace le bloc INTERNAL)
    if (body.type === "INTERNAL") {
      const participantIds = Array.from(
        new Set([currentUser.id, ...(body.participantIds ?? [])])
      );
      // 1) Cherche une conv où tous les participants demandés sont présents
      const candidates = await prisma.conversation.findMany({
        where: {
          type: "INTERNAL",
          participants: { every: { userId: { in: participantIds } } }, // tous les attendus présents
        },
        select: { id: true, _count: { select: { participants: true } } },
        take: 10,
      });

      // 2) Filtre côté code pour s’assurer qu’il n’y a PAS de participants en plus
      const exact = candidates.find(
        (c) => c._count.participants === participantIds.length
      );
      if (exact) return { id: exact.id }; // <-- réutilise, pas de doublon

      // 3) Sinon, créer
      const conv = await prisma.conversation.create({
        data: {
          type: "INTERNAL",
          participants: {
            createMany: { data: participantIds.map((userId) => ({ userId })) },
          },
        },
        select: { id: true },
      });
      return conv;
    } else {
      if (!body.patientId) throw forbidden("PATIENT_ID_REQUIRED");

      if (!isAdmin(currentUser.role)) {
        await ensureDoctorOwnsPatientOrAdmin(
          currentUser.id,
          currentUser.role,
          body.patientId
        );
      }
      // Pas de doublon de conv PATIENT par patient
      const existing = await prisma.conversation.findFirst({
        where: { type: "PATIENT", patientId: body.patientId },
        select: { id: true },
      });
      if (existing) return existing;

      // Ajoute automatiquement le DOCTOR owner si présent
      const patient = await prisma.patient.findUnique({
        where: { id: body.patientId },
        select: { ownerId: true },
      });

      const participantIds = Array.from(
        new Set([currentUser.id, ...(body.participantIds ?? [])])
      );
      const withOwner = patient?.ownerId
        ? Array.from(new Set([...participantIds, patient.ownerId]))
        : participantIds;

      const conv = await prisma.conversation.create({
        data: {
          type: "PATIENT",
          patientId: body.patientId,
          participants: {
            createMany: { data: withOwner.map((userId) => ({ userId })) },
          },
        },
        select: { id: true },
      });
      return conv;
    }
  },

  async listMyConversations(
    currentUser: { id: string; role: Role },
    q: {
      pageSize: number;
      cursor?: string;
      type?: ConversationType;
      patientId?: string;
    }
  ) {
    const decodedId = q.cursor
      ? Buffer.from(q.cursor, "base64").toString()
      : undefined;
    const limit = Math.max(1, Math.min(q.pageSize ?? 15, 100));

    const where: any = {
      participants: { some: { userId: currentUser.id } }, // même pour admin (badge cohérent)
    };
    if (q.type) where.type = q.type;
    if (q.patientId) where.patientId = q.patientId;

    const rows = await prisma.conversation.findMany({
      where,
      orderBy: [
        { lastMessageAt: "desc" },
        { createdAt: "desc" },
        { id: "desc" },
      ],
      take: limit + 1,
      ...(decodedId ? { skip: 1, cursor: { id: decodedId } } : {}),
      include: {
        patient: { select: { id: true, firstName: true, lastName: true } },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { content: true, createdAt: true },
        },
        // ✅ inclure l'utilisateur lié au participant
        participants: {
          select: {
            userId: true,
            lastReadAt: true,
            user: {
              // <-- ajout
              select: {
                id: true,
                firstName: true,
                lastName: true,
                role: true,
              },
            },
          },
        },
      },
    });

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;

    // unread par conversation (exclut mes messages)
    const convIds = items.map((i) => i.id);
    let unreadByConv: { conversationId: string; count: bigint }[] = [];
    if (convIds.length > 0) {
      // @ts-ignore
      unreadByConv = await prisma.$queryRaw`
      SELECT m."conversationId", COUNT(*)::bigint AS count
      FROM "Message" m
      LEFT JOIN "MessageReceipt" r ON r."messageId" = m.id AND r."userId" = ${
        currentUser.id
      }
      WHERE m."conversationId" IN (${Prisma.join(convIds)})
        AND m."senderId" <> ${currentUser.id}
        AND (r."readAt" IS NULL)
      GROUP BY m."conversationId"
    `;
    }
    const mapUnread = new Map(
      unreadByConv.map((r) => [r.conversationId, Number(r.count)])
    );

    const nextCursor = hasMore
      ? Buffer.from(items[items.length - 1].id).toString("base64")
      : null;

    return {
      items: items.map((i) => ({
        id: i.id,
        type: i.type,
        patientId: i.patientId,
        patient: i.patient
          ? {
              id: i.patient.id,
              firstName: i.patient.firstName,
              lastName: i.patient.lastName,
            }
          : null,
        lastMessageAt: i.lastMessageAt ?? i.createdAt,
        lastMessagePreview: i.messages[0]?.content ?? null,
        unreadCount: mapUnread.get(i.id) ?? 0,
        // ✅ renvoyer les participants avec l'user imbriqué
        participants: i.participants.map((p) => ({
          userId: p.userId,
          lastReadAt: p.lastReadAt,
          user: p.user
            ? {
                id: p.user.id,
                firstName: p.user.firstName,
                lastName: p.user.lastName,
                role: p.user.role,
              }
            : null,
        })),
      })),
      nextCursor,
    };
  },

  async getConversation(currentUser: { id: string; role: Role }, id: string) {
    await ensureParticipantOrAdmin(id, currentUser.id, currentUser.role); // <- bypass ADMIN
    return prisma.conversation.findUnique({
      where: { id },
      include: {
        participants: {
          select: {
            userId: true,
            lastReadAt: true,
            user: {
              // <-- ajout
              select: { id: true, firstName: true, lastName: true, role: true },
            },
          },
        },
        patient: {
          select: { id: true, firstName: true, lastName: true, ownerId: true },
        },
      },
    });
  },

  async addParticipants(
    currentUser: { id: string; role: Role },
    id: string,
    add: string[]
  ) {
    const conv = await prisma.conversation.findUnique({
      where: { id },
      select: { type: true, patientId: true },
    });
    if (!conv) throw new AppError(404, "CONVERSATION_NOT_FOUND");
    if (conv.type === "INTERNAL") {
      await assertParticipant(id, currentUser.id);
    } else {
      await ensureDoctorOwnsPatientOrAdmin(
        currentUser.id,
        currentUser.role,
        conv.patientId!
      );
    }

    const unique = Array.from(new Set(add));
    await prisma.conversationParticipant.createMany({
      data: unique.map((userId) => ({ conversationId: id, userId })),
      skipDuplicates: true,
    });
    return { added: unique.length };
  },

  async listMessages(
    currentUser: { id: string; role: Role },
    conversationId: string,
    q: { pageSize?: number; cursor?: string }
  ) {
    await ensureParticipantOrAdmin(
      conversationId,
      currentUser.id,
      currentUser.role
    );

    const decodedId = q.cursor
      ? Buffer.from(q.cursor, "base64").toString()
      : undefined;
    const limit = Math.max(1, Math.min(q.pageSize ?? 15, 100));

    const rows = await prisma.message.findMany({
      where: { conversationId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      ...(decodedId ? { skip: 1, cursor: { id: decodedId } } : {}),
      select: {
        id: true,
        senderId: true,
        content: true,
        type: true,
        attachments: true,
        createdAt: true,
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
      },
    });

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore
      ? Buffer.from(items[items.length - 1].id).toString("base64")
      : null;

    return { items, nextCursor };
  },

  async postMessage(
    currentUser: { id: string; role: Role },
    conversationId: string,
    body: { content: string; type?: MsgType; attachments?: Prisma.JsonValue[] }
  ) {
    const conv = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { id: true, type: true, patientId: true },
    });
    if (!conv) throw forbidden("CONVERSATION_NOT_FOUND");

    if (conv.type === "INTERNAL") {
      // ADMIN bypass sinon participant requis
      await ensureParticipantOrAdmin(conv.id, currentUser.id, currentUser.role);
    } else {
      // PATIENT: ADMIN bypass, sinon doctor propriétaire/collab
      await ensureDoctorOwnsPatientOrAdmin(
        currentUser.id,
        currentUser.role,
        conv.patientId!
      );
    }

    const msg = await prisma.message.create({
      data: {
        conversationId: conv.id,
        senderId: currentUser.id,
        content: body.content,
        type: body.type ?? "NOTE",
        attachments: body.attachments ?? undefined,
      },
      select: {
        id: true,
        senderId: true,
        content: true,
        type: true,
        attachments: true,
        createdAt: true,
      },
    });

    // metadata conversation
    await prisma.conversation.update({
      where: { id: conv.id },
      data: { lastMessageAt: new Date() },
    });

    return msg;
  },

  async markRead(currentUserId: string, messageId: string) {
    const msg = await prisma.message.findUnique({
      where: { id: messageId },
      select: { id: true, conversationId: true, createdAt: true },
    });
    if (!msg) throw new AppError(404, "MESSAGE_NOT_FOUND");
    await assertParticipant(msg.conversationId, currentUserId);

    const now = new Date();
    await prisma.$transaction([
      prisma.messageReceipt.update({
        where: { messageId_userId: { messageId, userId: currentUserId } },
        data: { readAt: now },
      }),
      prisma.conversationParticipant.update({
        where: {
          conversationId_userId: {
            conversationId: msg.conversationId,
            userId: currentUserId,
          },
        },
        data: { lastReadAt: now },
      }),
    ]);
    return { messageId, readAt: now.toISOString() };
  },

  async unreadSummary(currentUserId: string) {
    const rows = await prisma.$queryRaw<
      { conversationId: string; count: bigint }[]
    >`
    SELECT m."conversationId" AS "conversationId",
           COUNT(*)::bigint AS count
    FROM "Message" m
    JOIN "ConversationParticipant" p
      ON p."conversationId" = m."conversationId"
     AND p."userId" = ${currentUserId}     -- je suis participant
    LEFT JOIN "MessageReceipt" r
      ON r."messageId" = m.id
     AND r."userId" = ${currentUserId}
    WHERE r."readAt" IS NULL
      AND m."senderId" <> ${currentUserId} -- pas mes propres messages
    GROUP BY m."conversationId"
  `;
    const total = rows.reduce((acc, r) => acc + Number(r.count), 0);
    return {
      total,
      byConversation: rows.map((r) => ({
        conversationId: r.conversationId,
        count: Number(r.count),
      })),
    };
  },

  // QoL: envoi direct 1-to-1 interne (crée conv si besoin)
  async sendDirect(
    currentUser: { id: string; role: Role },
    recipientUserId: string,
    content: string,
    type: MsgType = "NOTE"
  ) {
    if (currentUser.id === recipientUserId)
      throw new AppError(400, "CANNOT_DIRECT_MESSAGE_YOURSELF");

    // cherche une conv INTERNAL à 2 participants
    const conv =
      (await prisma.conversation.findFirst({
        where: {
          type: "INTERNAL",
          participants: {
            every: { userId: { in: [currentUser.id, recipientUserId] } },
          },
        },
        select: { id: true },
      })) ??
      (await prisma.conversation.create({
        data: { type: "INTERNAL" },
        select: { id: true },
      }));

    // s'assurer des 2 participants
    await prisma.conversationParticipant.createMany({
      data: [
        { conversationId: conv.id, userId: currentUser.id },
        { conversationId: conv.id, userId: recipientUserId },
      ],
      skipDuplicates: true,
    });

    return this.postMessage(currentUser, conv.id, { content, type });
  },

  async listDirectoryUsers(me: { id: string }, q: DirectoryQuery) {
    const where: Prisma.UserWhereInput = {
      id: { not: me.id },
      role: q.role ? q.role : undefined,
      OR: q.q
        ? [
            { firstName: { contains: q.q, mode: "insensitive" } },
            { lastName: { contains: q.q, mode: "insensitive" } },
            { email: { contains: q.q, mode: "insensitive" } },
          ]
        : undefined,
      isActive: true,
    };

    const skip = (q.page! - 1) * q.limit!;
    const users = await prisma.user.findMany({
      where,
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      skip,
      take: q.limit,
      select: {
        id: true,
        role: true,
        firstName: true,
        lastName: true,
        email: true,
        avatarUrl: true,
      },
    });

    const total = await prisma.user.count({ where });
    return {
      items: users,
      page: q.page,
      limit: q.limit,
      total,
    };
  },
};
