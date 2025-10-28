import { prisma } from '../../infra/prisma';
import { AppError, forbidden, notFound } from '../../utils/appError';
import type { Role } from '@prisma/client';
import { ListDoctorsQuery, UpsertProfileDTO } from './dto';


type Auth = { id: string; role: Role };
const isAdmin = (r: Role) => r === 'ADMIN';

const isSelectedDoctor = {
  id: true, email: true, firstName: true, lastName: true,
  DoctorProfile: { select: { specialties: true, phone: true, bio: true } },
  createdAt: true,
} as const;

export async function listDoctorsPaged(q: ListDoctorsQuery) {
  const where: any = {
    role: 'DOCTOR',
    ...(q.specialty ? { DoctorProfile: { specialties: { has: q.specialty } } } : {}),
    ...(q.q
      ? {
          OR: [
            { firstName: { contains: q.q, mode: 'insensitive' } },
            { lastName:  { contains: q.q, mode: 'insensitive' } },
            { email:     { contains: q.q, mode: 'insensitive' } },
            { DoctorProfile: { bio: { contains: q.q, mode: 'insensitive' } } },
          ],
        }
      : {}),
  };

  const page = q.page ?? 1;
  const pageSize = q.pageSize ?? 20;
  const skip = (page - 1) * pageSize;

  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: q.orderBy ? [{ [q.orderBy]: q.order }] : [{ createdAt: 'desc' }],
      select: {
        ...isSelectedDoctor
      },
    }),
    prisma.user.count({ where }),
  ]);

  return {
    items,
    meta: {
      mode: 'offset',
      total,
      page,
      pageSize,
      hasNextPage: page * pageSize < total,
      hasPreviousPage: page > 1,
      orderBy: q.orderBy,
      order: q.order,
    },
  };
}


export async function getDoctorProfile(userId: string) {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true, role: true, firstName: true, lastName: true, email: true,
      DoctorProfile: true,
    },
  });
  if (!u || u.role !== 'DOCTOR') throw notFound('NOT_FOUND', 'Doctor not found');
  return u;
}

export async function upsertDoctorProfile(auth: Auth, userId: string, input: UpsertProfileDTO) {
  // autorisé: ADMIN ou le médecin lui-même
  if (!(isAdmin(auth.role) || auth.id === userId)) {
    throw forbidden('FORBIDDEN', 'Not allowed');
  }
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true } });
  if (!u || u.role !== 'DOCTOR') throw new AppError(400, 'INVALID_DOCTOR', 'userId must be a DOCTOR');

  const specialties = input.specialties.map(s => s.trim()).filter(Boolean);

  await prisma.doctorProfile.upsert({
    where: { userId },
    update: { specialties, bio: input.bio ?? null, phone: input.phone ?? null },
    create: { userId, specialties, bio: input.bio ?? null, phone: input.phone ?? null },
  });

  // Retourne le profil à jour
  const updated = await prisma.user.findUnique({
    where: { id: userId },
    select: isSelectedDoctor,
  });
  return updated;
}

export async function listDistinctSpecialties(): Promise<string[]> {
  // Prisma ne fournit pas nativement DISTINCT UNNEST sur array → raw SQL Postgres
  const rows: Array<{ specialty: string | null }> = await prisma.$queryRawUnsafe(
    'SELECT DISTINCT unnest("DoctorProfile"."specialties") AS specialty FROM "DoctorProfile"'
  );
  return rows.map(r => r.specialty!).filter(Boolean).sort((a, b) => a.localeCompare(b));
}
