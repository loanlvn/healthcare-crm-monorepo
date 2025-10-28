import { Request, Response } from "express";
import { asyncHandler } from "../../../middlewares/asyncHandler";
import { AppError } from "../../../utils/appError";
import { ChatService } from "./servicesChat";
import {
  createConversationSchema,
  paginationSchema,
  postMessageSchema,
  directoryQuerySchema,
  directMessageSchema,
} from "./dto";
import { Role } from "@prisma/client";

export const ChatController = {
  createConversation: asyncHandler(async (req: Request, res: Response) => {
    const dto = createConversationSchema.parse(req.body);
    if (dto.type === "PATIENT" && !dto.patientId)
      throw new AppError(400, "PATIENT_ID_REQUIRED");

    const me = { id: req.user!.id, role: req.user!.role as Role };
    const conv = await ChatService.createConversation(me, dto);
    res.status(201).json(conv);
  }),

  listConversations: asyncHandler(async (req: Request, res: Response) => {
    const q = paginationSchema
      .pick({ pageSize: true, cursor: true, type: true, patientId: true })
      .parse(req.query);

    const me = { id: req.user!.id, role: req.user!.role as Role };
    const data = await ChatService.listMyConversations(me, q as any);
    res.json(data);
  }),

  getConversation: asyncHandler(async (req: Request, res: Response) => {
    const conv = await ChatService.getConversation(
      { id: req.user!.id, role: req.user!.role as Role },
      req.params.id
    );
    res.json(conv);
  }),

  addParticipants: asyncHandler(async (req: Request, res: Response) => {
    const { add } = req.body as { add: string[] };
    if (!Array.isArray(add) || add.length === 0)
      throw new AppError(400, "ADD_REQUIRED");

    const me = { id: req.user!.id, role: req.user!.role as Role };
    const data = await ChatService.addParticipants(me, req.params.id, add);
    res.json(data);
  }),

  listMessages: asyncHandler(async (req: Request, res: Response) => {
    const q = paginationSchema
      .pick({ pageSize: true, cursor: true })
      .parse(req.query);

    const me = { id: req.user!.id, role: req.user!.role as Role };
    const data = await ChatService.listMessages(me, req.params.id, q as any);
    res.json(data);
  }),

  postMessage: asyncHandler(async (req: Request, res: Response) => {
    const dto = postMessageSchema.parse(req.body);

    const me = { id: req.user!.id, role: req.user!.role as Role };
    const msg = await ChatService.postMessage(me, req.params.id, dto);
    res.status(201).json(msg);
  }),

  markRead: asyncHandler(async (req: Request, res: Response) => {
    const out = await ChatService.markRead(req.user!.id, req.params.id);
    res.json(out);
  }),

  unreadSummary: asyncHandler(async (req: Request, res: Response) => {
    const data = await ChatService.unreadSummary(req.user!.id);
    res.json(data);
  }),

  sendDirect: asyncHandler(async (req: Request, res: Response) => {
    const me = { id: req.user!.id, role: req.user!.role as Role };

    // Aligne avec le front : { toUserId, content, type? }
    const dto = directMessageSchema.parse(req.body); // { toUserId, content, type? }

    const msg = await ChatService.sendDirect(
      me,
      dto.toUserId,
      dto.content,
      dto.type
    );
    res.status(201).json(msg);
  }),

  directoryUsers: asyncHandler(async (req: Request, res: Response) => {
    const me = req.user!;
    const q = directoryQuerySchema.parse(req.query);
    const data = await ChatService.listDirectoryUsers(me, q);
    res.json(data);
  }),
};
