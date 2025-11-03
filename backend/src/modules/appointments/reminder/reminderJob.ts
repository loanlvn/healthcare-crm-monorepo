import { prisma } from "../../../infra/prisma";
import { ReminderService } from "../reminder/serviceReminder";
import { NotificationService } from "../serviceAppointment";

export function startReminderJob() {
  // toutes les 5 minutes
  const INTERVAL_MS = 5 * 60 * 1000;
  let interval: NodeJS.Timeout | null = null;
  let initialTimeout: NodeJS.Timeout | null = null;

  async function tick() {
    const now = new Date();

    const due = await prisma.appointmentReminder.findMany({
      where: {
        status: "PENDING",
        scheduledAt: { lte: now },
      },
      orderBy: { scheduledAt: "asc" },
      take: 50,
    });

    for (const r of due) {
      try {
        await NotificationService.sendAppointmentReminder(r.appointmentId);
        await ReminderService.markSent(r.id);
      } catch (err) {
        await ReminderService.markFailed(r.id, err);
      }
    }
  }

  const delay = INTERVAL_MS - (Date.now() % INTERVAL_MS);
  initialTimeout = setTimeout(() => {
    tick().catch(console.error);
    interval = setInterval(() => tick().catch(console.error), INTERVAL_MS);
  }, delay);

  return () => {
    if (initialTimeout) clearTimeout(initialTimeout);
    if (interval) clearInterval(interval);
  };
}
