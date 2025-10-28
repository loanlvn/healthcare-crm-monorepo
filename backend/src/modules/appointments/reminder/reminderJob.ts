import { prisma } from "../../../infra/prisma";
import { ReminderService } from "../reminder/serviceReminder";
import { NotificationService } from "../serviceAppointment";

export function startReminderJob() {
  const INTERVAL_MS = 5 * 60 * 1000;

  let interval: NodeJS.Timeout | null = null;
  let initialTimeout: NodeJS.Timeout | null = null;

  async function tick() {
    const now = new Date();

    const due = await prisma.appointmentReminder.findMany({
      where: {
        status: "PENDING",
        scheduledAt: { lte: now },
        appointment: { status: { in: ["SCHEDULED", "CONFIRMED"] as any } },
      },
      select: { id: true, appointmentId: true },
      orderBy: { scheduledAt: "asc" },
      take: 100,
    });

    for (const r of due) {
      try {
        await NotificationService.sendAppointmentReminder(r.appointmentId);
        await ReminderService.markSent(r.id);
      } catch (err) {
        console.error("[reminder] fail", r.id, err);
        await ReminderService.markFailed(r.id, err);
      }
    }
  }

  const delay = INTERVAL_MS - (Date.now() % INTERVAL_MS);
  initialTimeout = setTimeout(() => {
    tick();
    interval = setInterval(tick, INTERVAL_MS);
  }, delay);

  // ← IMPORTANT : retourne un stop() pour le shutdown
  return () => {
    if (initialTimeout) clearTimeout(initialTimeout);
    if (interval) clearInterval(interval);
  };
}
