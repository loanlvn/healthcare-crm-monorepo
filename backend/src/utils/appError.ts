export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'UNAUTHENTICATED'
  | 'TOKEN_INVALID'
  | 'TOKEN_EXPIRED'
  | 'FORBIDDEN'
  | 'FORBIDDEN_SELF'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'BAD_REQUEST'
  | 'UNPROCESSABLE'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR'
  // métiers:
  | 'INVALID_CREDENTIALS'
  | 'NO_REFRESH_TOKEN'
  | 'REFRESH_INVALID'
  | 'SIGNUP_DISABLED'
  | 'EMAIL_TAKEN'
  | 'OWNER_REQUIRED'
  | 'USER_DISABLED'
  | 'PATIENT_ID_REQUIRED'
  | 'PATIENT_NOT_FOUND'
  | 'APPOINTMENT_NOT_FOUND'
  | 'PASSWORD_CHANGE_REQUIRED'
  | 'TOO_MANY_ATTEMPTS'
  | 'CODE_EXPIRED'
  | 'CODE_INVALID'
  | 'INVALID_RESET_TOKEN'
  | 'RESET_NOT_VERIFIED'
  | 'RESET_ALREADY_DONE'
  | 'PASSWORD_UNCHANGED'
  | 'DOCTOR_NOT_FOUND'
  | 'DOCTOR_REQUIRED'
  | 'DOCTOR_LACKS_SPECIALTY'
  | 'INVALID_DOCTOR'
  | 'CANNOT_ASSIGN_OWNER'
  | 'CANNOT_DELETE_SELF'
  | 'CANNOT_DISABLE_SELF'
  | 'CANNOT_CHANGE_ROLE_SELF'
  | 'CANNOT_ASSIGN_DOCTOR'
  | 'CANNOT_UNASSIGN_DOCTOR'
  | 'CANNOT_UPDATE_OWNER'
  | 'CANNOT_REMOVE_OWNER'
  | 'ONLY_OWNER_DOCTOR_CAN_POST'
  | 'ONLY_OWNER_DOCTOR_CAN_CREATE'
  | 'ONLY_DOCTOR_CAN_CREATE_PATIENT_CONV'
  | 'NOT_PARTICIPANT'
  | 'NOT_PATIENT_OWNER'
  | 'CONVERSATION_NOT_FOUND'
  | 'MESSAGE_NOT_FOUND'
  | 'CANNOT_DIRECT_MESSAGE_YOURSELF'
  | 'ADD_REQUIRED'
  | 'RECIPIENT_USER_ID & CONTENT_REQUIRED'
  | 'INVOICE_NOT_FOUND'
  | 'INVOICE_LOCKED'
  | 'CANNOT_SEND_VOID'
  | 'PATIENT_MISSING_EMAIL'
  | 'INVOICE_ALREADY_EXISTS_FOR_APPOINTMENT'
  | 'CANNOT_VOID_PAID'
  | 'PAYMENT_NOT_FOUND'
  | 'INVOICE_VOID'
  | 'INVOICE_ALREADY_PAID'
  | 'STRIPE_CUSTOMER_NOT_FOUND';

export class AppError extends Error {
  status: number;
  code: ErrorCode;
  details?: unknown;

  constructor(status: number, code: ErrorCode, message?: string, details?: unknown) {
    super(message ?? code);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = details;
    // Maintient la stack propre
    if (Error.captureStackTrace) Error.captureStackTrace(this, AppError);
  }
}

// Helpers courants
export const badRequest      = (code: ErrorCode = 'BAD_REQUEST', d?: unknown) => new AppError(400, code, undefined, d);
export const unauthorized    = (code: ErrorCode = 'UNAUTHORIZED', d?: unknown) => new AppError(401, code, undefined, d);
export const unauthenticated = (code: ErrorCode = 'UNAUTHENTICATED', d?: unknown) => new AppError(401, code, undefined, d);
export const forbidden       = (code: ErrorCode = 'FORBIDDEN', d?: unknown) => new AppError(403, code, undefined, d);
export const notFound        = (code: ErrorCode = 'NOT_FOUND', d?: unknown) => new AppError(404, code, undefined, d);
export const conflict        = (code: ErrorCode = 'CONFLICT', d?: unknown) => new AppError(409, code, undefined, d);
export const unprocessable   = (code: ErrorCode = 'UNPROCESSABLE', d?: unknown) => new AppError(422, code, undefined, d);
export const rateLimited     = (code: ErrorCode = 'RATE_LIMITED', d?: unknown) => new AppError(429, code, undefined, d);
export const internalError   = (code: ErrorCode = 'INTERNAL_ERROR', d?: unknown) => new AppError(500, code, undefined, d);
export const userDisabled    = (code: ErrorCode = 'USER_DISABLED', d?: unknown) => new AppError(401, code, undefined, d);
export const invalidToken    = (code: ErrorCode = 'TOKEN_INVALID', d?: unknown) => new AppError(498, code, undefined, d);