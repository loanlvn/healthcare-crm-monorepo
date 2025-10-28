// modules/users/service.ts
import { prisma } from '../../infra/prisma';
import bcrypt from 'bcryptjs';
import { conflict, forbidden, notFound, unauthorized } from '../../utils/appError'
import { parsePagination, toPrismaOffsetArgs, makeOffsetPage } from '../../utils/pagination';

const safeSelect = {
  id: true, email: true, firstName: true, lastName: true,
  role: true, isActive: true, createdAt: true, updatedAt: true, avatarUrl: true, 
  avatarUpdatedAt: true, mustChangePassword: true,
} as const;


export async function createUser(adminId: string, dto: {
  email: string; password: string; firstName: string; lastName: string; role: 'ADMIN'|'DOCTOR'|'SECRETARY'; isActive?: boolean;
}) {
  // (optionnel) empêcher qu’un non-admin arrive ici
  const admin = await prisma.user.findUnique({ where: { id: adminId } });
  if (!admin || admin.role !== 'ADMIN') throw forbidden('FORBIDDEN');

  const exists = await prisma.user.findUnique({ where: { email: dto.email } });
  if (exists) throw conflict('EMAIL_TAKEN');

  const passwordHash = await bcrypt.hash(dto.password, 10);
  const user = await prisma.user.create({
    data: {
      email: dto.email,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      role: dto.role,
      isActive: dto.isActive ?? true,
      mustChangePassword: true,
    },
    select: safeSelect
  });
  return user;
}

export async function updateUser(actorId: string, id: string, dto: {
  firstName?: string; lastName?: string; role?: 'ADMIN'|'DOCTOR'|'SECRETARY'; isActive?: boolean; password?: string;
}) {
  const actor = await prisma.user.findUnique({ where: { id: actorId } });
  if (!actor) throw unauthorized('UNAUTHORIZED');

  if ((dto.role || typeof dto.isActive === 'boolean') && actor.role !== 'ADMIN') {
    throw forbidden('FORBIDDEN');
  }

  if (dto.role === 'ADMIN' || dto.role === 'DOCTOR' || dto.role === 'SECRETARY') {
    // ok, c'est contrôlé par la condition ci-dessus
  }

  const data: any = { ...dto };
  if (dto.password) {
    data.passwordHash = await bcrypt.hash(dto.password, 10);
    data.mustChangePassword = true;
  }

  const user = await prisma.user.update({
    where: { id },
    data,
    select: safeSelect,
  });

  if (!dto.password) {
    await prisma.refreshToken.deleteMany({ where: { userId: id } }).catch(() => {});
  }

  return user;
}


export async function getMe(userId: string) {
  const me = await prisma.user.findUnique({ where: { id: userId }, select: safeSelect });
  if (!me) throw notFound('NOT_FOUND');
  return me;
};

export async function getUserById(actorId: string, actorRole: 'ADMIN' | 'DOCTOR' | 'SECRETARY', targetId: string) {
  if (actorRole !== 'ADMIN' && actorId !== targetId) throw forbidden('FORBIDDEN_SELF');
  const user = await prisma.user.findUnique({ where: { id: targetId }, select: safeSelect });
  if (!user) throw notFound('NOT_FOUND');
  return user;
}
// GET /users ADMIN ONLY
export async function listUsers(query: {
  q?: string; role?: 'ADMIN'|'DOCTOR'|'SECRETARY'; isActive?: boolean; 
  page?: number; pageSize?: number; orderBy?: string; order?: 'asc'|'desc';
  defaultPageSize?: number; defaultOrder?: 'asc'|'desc';
}) {
  const pg = parsePagination(query, { defaultPageSize: 20, maxPageSize: 100, defaultOrder: 'desc' });
  const where: any = {};
  if (query.q) {
    where.OR = [
      { firstName: { contains: query.q, mode: 'insensitive' } },
      { lastName:  { contains: query.q, mode: 'insensitive' } },
      { email:     { contains: query.q, mode: 'insensitive' } },
    ];
  }
  if (query.role) where.role = query.role;
  if (typeof query.isActive === 'boolean') where.isActive = query.isActive;

const prismaArgs = {
    where,
    select: safeSelect,
    ...toPrismaOffsetArgs(pg),
  };

  const [items, total] = await Promise.all([
    prisma.user.findMany(prismaArgs),
    prisma.user.count({ where }),
  ]);

  return makeOffsetPage(items, total, pg);
}

// PUT /users/:id/deactivate ADMIN ONLY

export async function disableUser(actorRole: 'ADMIN' | 'DOCTOR' | 'SECRETARY', id: string) {
  if (actorRole !== 'ADMIN') throw forbidden('FORBIDDEN');
  const found = await prisma.user.findUnique({ where: { id }, select: { id: true } });
  if (!found) throw notFound('NOT_FOUND');

  const updated = await prisma.user.update({
    where: { id },
    data: { isActive: false },
    select: safeSelect
  });
  return updated;
};