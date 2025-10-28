import { z } from "zod";

export const idSchema = z.string().uuid();

export const createConversationSchema = z
  .object({
    type: z.enum(["INTERNAL", "PATIENT"]),
    participantIds: z.array(idSchema).default([]),
    patientId: idSchema.optional(),
  })
  .superRefine((val, ctx) => {
    if (val.type === "PATIENT" && !val.patientId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["patientId"],
        message: "PATIENT_ID_REQUIRED",
      });
    }
    if (
      val.type === "INTERNAL" &&
      (!val.participantIds || val.participantIds.length === 0)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["participantIds"],
        message: "AT_LEAST_ONE_PARTICIPANT",
      });
    }
  });
export type CreateConversationDto = z.infer<typeof createConversationSchema>;

export const attachmentSchema = z.object({
  name: z.string().min(1),
  url: z.string().url(),
  size: z.number().int().nonnegative().optional(),
  mime: z.string().min(3).optional(),
});

export const postMessageSchema = z.object({
  content: z.string().min(1).max(5000),
  type: z.enum(["NOTE", "ALERT", "REMINDER"]).optional().default("NOTE"),
  attachments: z.array(attachmentSchema).max(10).optional(),
});
export type PostMessageDto = z.infer<typeof postMessageSchema>;

export const paginationSchema = z.object({
  pageSize: z.coerce.number().int().min(1).max(50).optional().default(15),
  cursor: z.string().optional(),
  q: z.string().min(1).optional(),
  type: z.enum(["INTERNAL", "PATIENT"]).optional(),
  patientId: idSchema.optional(),
  direction: z.enum(["back", "fwd"]).optional().default("back"),
});
export type PaginationQuery = z.infer<typeof paginationSchema>;

export const directoryQuerySchema = z.object({
  q: z.string().trim().optional(),
  role: z.enum(["DOCTOR", "SECRETARY", "ADMIN" ]).optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
});
export type DirectoryQuery = z.infer<typeof directoryQuerySchema>;

export const directMessageSchema = z.object({
  toUserId: idSchema,
  content: z.string().min(1).max(5000),
  type: z.enum(["NOTE", "ALERT", "REMINDER"]).optional().default("NOTE"),
});
export type DirectMessageDto = z.infer<typeof directMessageSchema>;
