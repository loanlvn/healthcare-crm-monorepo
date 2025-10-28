// src/routes/chat.routes.ts
import { Router } from 'express';
import { ChatController } from './controllerChat';

const r = Router();

// Conversations
r.post('', ChatController.createConversation);
r.get('', ChatController.listConversations);

r.get('/me/unread-count', ChatController.unreadSummary);
r.post('/messages/direct', ChatController.sendDirect);
r.post('/messages/:id/read', ChatController.markRead);
r.get('/directory', ChatController.directoryUsers);

// puis les dynamiques
r.get('/:id/messages', ChatController.listMessages);
r.post('/:id/messages', ChatController.postMessage);
r.post('/:id/participants', ChatController.addParticipants);
r.get('/:id', ChatController.getConversation);

export default r;
