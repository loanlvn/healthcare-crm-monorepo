/* eslint-disable */
import { prisma } from '../src/infra/prisma';

async function main() {
  const now = new Date();
  const future = await prisma.appointment.findMany({
    where: {
      startsAt: { gt: now },
      status: { in: ['SCHEDULED', 'CONFIRMED'] as any },
    },
    select: { id: true, startsAt: true },
  });

  for (const a of future) {
    const scheduledAt = new Date(a.startsAt.getTime() - 24 * 60 * 60 * 1000);
    await prisma.appointmentReminder.upsert({
      where: { appointmentId: a.id },
      create: { appointmentId: a.id, scheduledAt, status: 'PENDING' as any },
      update: { scheduledAt, status: 'PENDING' as any, lastError: null, retryCount: 0 },
    });
  }

  console.log(`Backfill OK: ${future.length} reminders (PENDING)`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
