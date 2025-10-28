export type Role = "ADMIN" | "DOCTOR" | "SECRETARY";

export type LoginResponse = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: Role;
    isActive: boolean;
    mustChangePassword: boolean;
    createdAt: string;
    updatedAt?: string;
    avatarUrl?: string | null;
  };
};

export type User = LoginResponse["user"];

export type CreateUserDTO = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: Role;
  isActive?: boolean;
};

export type UpdateUserDTO = Partial<Omit<CreateUserDTO, "password">> & {
  password?: string;
};

export type ID = string;
export type UserRole = "ADMIN" | "DOCTOR" | "SECRETARY";
export type ConversationType = "INTERNAL" | "PATIENT";
export type MsgType = "NOTE" | "ALERT" | "REMINDER";

export type DirectoryUser = {
  id: ID;
  role: UserRole;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl?: string | null;
};

export type PatientMini = {
  id: ID;
  firstName?: string | null;
  lastName?: string | null;
  ownerId?: ID | null; 
};

export type Attachment = {
  name: string;
  url: string;
  size?: number;
  mime?: string;
};

export type MessageItem = {
  id: ID;
  conversationId: ID;
  senderId: ID; // <-- adopté
  sender?: DirectoryUser; // mini profil pour badge/avatar
  type: MsgType;
  content: string;
  attachments?: Attachment[];
  createdAt: string; // ISO
  editedAt?: string | null;
  receipt?: {
    readAt?: string | null; // pour l’utilisateur courant
  };
};

export type ConversationItem = {
  id: ID;
  type: ConversationType;
  title: string; // titre prêt à afficher (serveur) – ex. “Patient · Sofia Lima” ou “Interne”
  patient?: PatientMini; // si type === 'PATIENT'
  participants: DirectoryUser[];
  lastMessage?: MessageItem | null; // au lieu de lastMessagePreview
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
};

export type CursorPage<T> = {
  items: T[];
  nextCursor?: string; 
};

export type UnreadSummary = {
  total: number;
  byConversation: { conversationId: ID; count: number }[];
};


export type PageCursor<T> = {
  items: T[];
  nextCursor?: string | null;
};


export type Patient = {
id: string;
firstName: string;
lastName: string;
birthDate?: string | null; // UI = string YYYY-MM-DD
phone?: string | null;
email?: string | null;
address?: string | null;
assuranceNumber?: string | null;
doctorName?: string | null;
notes?: string | null;
ownerId: string;
};


export type Conversation = {
id: string;
type: ConversationType;
patientId?: string | null;
patient?: { id: string; firstName: string; lastName: string } | null;
lastMessageAt?: string | null;
lastMessagePreview?: string | null;
unreadCount?: number;
participants?: { userId: string; lastReadAt?: string | null }[];
};


export type Message = {
id: string;
conversationId: string;
senderId: string;
content: string;
type: MsgType;
attachments?: unknown;
createdAt: string;
};