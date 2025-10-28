import type { Request, Response } from 'express';
import { loginSchema, refreshSchema, logoutSchema, changePasswordSchema,
   forgotRequestSchema, forgotResetSchema, forgotVerifySchema } from './dto';
import * as svc from './serviceAuth';
import { unauthorized } from '../../utils/appError';

export async function postLogin(req: Request, res: Response) {
  const { email, password } = loginSchema.parse(req.body);
  const out = await svc.login(email, password);
  return res.json(out);
}

export async function postRefresh(req: Request, res: Response) {
  const { refreshToken } = refreshSchema.parse(req.body);
  const out = await svc.refresh(refreshToken);
  return res.json(out);
}

export async function postLogout(req: Request, res: Response) {
  const { refreshToken } = logoutSchema.parse(req.body);
  await svc.logout(refreshToken);
  return res.status(204).send();
}

export async function postChangePassword(req: Request, res: Response) {
  const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
  const userId: string | undefined = req.user?.id;
  if (!userId) throw unauthorized('UNAUTHORIZED');
  await svc.changePasswordSelf(userId, currentPassword, newPassword);
  return res.status(204).end();
}

export async function postForgotRequest(req: Request, res: Response) {
  const { email } = forgotRequestSchema.parse(req.body);
  await svc.forgotPasswordRequest(email);
  return res.status(204).end(); // toujours 204
}

export async function postForgotVerify(req: Request, res: Response) {
  const { email, code } = forgotVerifySchema.parse(req.body);
  const out = await svc.forgotPasswordVerify(email, code);
  return res.status(200).json(out); // { resetToken }
}

export async function postForgotReset(req: Request, res: Response) {
  const { resetToken, newPassword } = forgotResetSchema.parse(req.body);
  await svc.forgotPasswordReset(resetToken, newPassword);
  return res.status(204).end();
}

