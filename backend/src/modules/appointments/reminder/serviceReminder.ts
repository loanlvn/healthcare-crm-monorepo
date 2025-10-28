import { prisma } from "../../../infra/prisma";

export const ReminderService = {
  async upsertForAppointment(appointmentId: string, startsAt: Date) {
    const scheduledAt = new Date(startsAt.getTime() - 24 * 60 * 60 * 1000);
    return prisma.appointmentReminder.upsert({
      where: { appointmentId },
      create: { appointmentId, scheduledAt, status: "PENDING" },
      update: { scheduledAt, status: "PENDING", lastError: null },
    });
  },

  async cancelForAppointment(appointmentId: string) {
    return prisma.appointmentReminder.updateMany({
      where: { appointmentId, status: { in: ["PENDING", "FAILED"] } },
      data: { status: "CANCELLED" },
    });
  },

  async markSent(id: string) {
    return prisma.appointmentReminder.update({
      where: { id },
      data: { status: "SENT", sentAt: new Date(), lastError: null },
    });
  },

  async markFailed(id: string, err: unknown) {
    return prisma.appointmentReminder.update({
      where: { id },
      data: {
        status: "FAILED",
        retryCount: { increment: 1 },
        lastError: err instanceof Error ? err.message : String(err),
      },
    });
  },
};
