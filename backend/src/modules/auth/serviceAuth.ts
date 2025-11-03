import { prisma } from "../../infra/prisma";
import bcrypt from "bcryptjs";
import jwt, { type Secret, type SignOptions, sign, verify } from "jsonwebtoken";
import { randomInt, randomUUID } from "node:crypto";
import type { User } from "@prisma/client";
import {
  AppError,
  badRequest,
  notFound,
  userDisabled,
} from "../../utils/appError";
import {
  sendResetCodeMail,
  sendPasswordChangedMail,
} from "../../mailer/mailer";

const ACCESS_SECRET: Secret = process.env.JWT_ACCESS_SECRET;
const REFRESH_SECRET: Secret = process.env.JWT_REFRESH_SECRET;

const ACCESS_TTL: SignOptions["expiresIn"] =
  (process.env.TOKEN_TTL_ACCESS as any) || "30m";
const REFRESH_TTL: SignOptions["expiresIn"] =
  (process.env.TOKEN_TTL_REFRESH as any) || "30d";

const RESET_SECRET = process.env.RESET_SECRET!;
const RESET_TTL =
  (process.env.RESET_TTL as SignOptions["expiresIn"]) ?? "10m";
const RESET_CODE_TTL_MIN = (() => {
  const raw =
    process.env.RESET_CODE_TTL_MIN ?? process.env.RESET_CODE_TTL ?? "10";
  const n = Number.parseInt(String(raw), 10);
  return Number.isFinite(n) && n > 0 ? n : 10;
})();
const RESET_MAX_ATTEMPTS = Number(process.env.RESET_MAX_ATTEMPTS ?? 5);
const SALT_ROUNDS = Number(process.env.SALT_ROUNDS ?? 10);

function toAuthUser(u: User) {
  const {
    id,
    email,
    firstName,
    lastName,
    role,
    isActive,
    mustChangePassword,
    createdAt,
    updatedAt,
  } = u;
  return {
    id,
    email,
    firstName,
    lastName,
    role,
    isActive,
    mustChangePassword,
    createdAt: createdAt.toISOString(),
    updatedAt: updatedAt?.toISOString(),
  };
}

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive) throw new AppError(401, "INVALID_CREDENTIALS");
  if (!user.isActive) throw userDisabled("USER_DISABLED");

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) throw new AppError(401, "INVALID_CREDENTIALS");

  const accessToken = jwt.sign(
    { sub: user.id, role: user.role },
    ACCESS_SECRET,
    { expiresIn: ACCESS_TTL }
  );
  const tokenId = randomUUID();
  const refreshToken = jwt.sign({ sub: user.id, tokenId }, REFRESH_SECRET, {
    expiresIn: REFRESH_TTL,
  });

  await prisma.refreshToken.create({
    data: {
      id: tokenId,
      userId: user.id,
      token: refreshToken,
      revoked: false,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
    },
  });

  const decoded = jwt.decode(accessToken) as { exp?: number | null };
  const now = Math.floor(Date.now() / 1000);
  const expiresIn = decoded.exp ? Math.max(0, decoded.exp - now) : 15 * 60;

  return { accessToken, refreshToken, expiresIn, user: toAuthUser(user) };
}

export async function refresh(refreshToken: string) {
  let payload: any;
  try {
    payload = jwt.verify(refreshToken, REFRESH_SECRET);
  } catch {
    throw new AppError(401, "REFRESH_INVALID");
  }

  const db = await prisma.refreshToken.findUnique({
    where: { id: payload.tokenId },
  });
  if (!db || db.revoked || db.token !== refreshToken)
    throw new AppError(401, "REFRESH_INVALID");

  // rotation
  await prisma.refreshToken.update({
    where: { id: db.id },
    data: { revoked: true },
  });

  const newId = randomUUID();
  const newRefresh = jwt.sign(
    { sub: db.userId, tokenId: newId },
    REFRESH_SECRET,
    { expiresIn: REFRESH_TTL }
  );
  await prisma.refreshToken.create({
    data: {
      id: newId,
      userId: db.userId,
      token: newRefresh,
      revoked: false,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
    },
  });

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: db.userId },
  });
  if (!user.isActive) throw userDisabled("USER_DISABLED");

  const access = jwt.sign({ sub: user.id, role: user.role }, ACCESS_SECRET, {
    expiresIn: ACCESS_TTL,
  });
  return { accessToken: access, refreshToken: newRefresh, expiresIn: 15 * 60 };
}

export async function logout(refreshToken: string) {
  try {
    const payload: any = jwt.verify(refreshToken, REFRESH_SECRET);
    await prisma.refreshToken.update({
      where: { id: payload.tokenId },
      data: { revoked: true },
    });
  } catch {
    // ignore
  }
}

export async function changePasswordSelf(
  userId: string,
  currentPassword: string,
  newPassword: string
) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, passwordHash: true, isActive: true },
  });
  if (!user || !user.isActive) throw notFound("NOT_FOUND");

  // Vérifier le mot de passe actuel
  const ok = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!ok)
    throw new AppError(
      400,
      "INVALID_CREDENTIALS",
      "Current password is incorrect"
    );

  // Vérifier que le nouveau mot de passe est différent
  const same = await bcrypt.compare(newPassword, user.passwordHash);
  if (same)
    throw badRequest(
      "BAD_REQUEST",
      "New password must be different from the current one"
    );

  // Hasher + écrire + mustChangePassword false + révoquer refresh tokens
  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        mustChangePassword: false, // mettre à false !!!!!!!!!!!
        updatedAt: new Date(),
      },
    });

    await tx.refreshToken
      .deleteMany({ where: { userId: user.id } })
      .catch(() => {});
  });

  // Client DOIT relogin
  return;
}

function generateResetCode6() {
  return String(Math.floor(Math.random() * 1_000_000)).padStart(6, "0");
}

export async function forgotPasswordRequest(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive) return; // silent

  // Invalider les reset precedents non comptés
  await prisma.passwordReset
    .deleteMany({
      where: {
        userId: user.id,
        completedAt: null,
      },
    })
    .catch(() => {
      // ignore
    });
  const code = generateResetCode6();
  const codeHash = await bcrypt.hash(code, SALT_ROUNDS);
  const expiresAt = new Date(Date.now() + RESET_CODE_TTL_MIN * 60 * 1000);

  try {
    await prisma.passwordReset.create({
      data: {
        userId: user.id,
        codeHash,
        expiresAt,
      },
    });
  } catch (e: any) {
    console.error(
      "Prisma error om password reset creation",
      e?.code,
      e?.meta,
      e?.message
    );
    throw badRequest("BAD_REQUEST", "Could not create reset request");
  }
  await sendResetCodeMail(user.email, code);
}

export async function forgotPasswordVerify(email: string, code: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive) throw notFound("NOT_FOUND");

  const pr = await prisma.passwordReset.findFirst({
    where: {
      userId: user.id,
      completedAt: null,
    },
    orderBy: { createdAt: "desc" },
  });
  if (!pr) throw badRequest("BAD_REQUEST", "No reset request found");

  if (pr.attempts >= RESET_MAX_ATTEMPTS) {
    throw new AppError(429, "TOO_MANY_ATTEMPTS", "Too many reset attempts");
  }
  if (pr.expiresAt < new Date()) {
    throw new AppError(400, "CODE_EXPIRED", "Reset code expired");
  }

  const ok = await bcrypt.compare(code, pr.codeHash);
  await prisma.passwordReset.update({
    where: { id: pr.id },
    data: {
      attempts: pr.attempts + (ok ? 0 : 1),
      verifiedAt: ok ? new Date() : pr.verifiedAt,
    },
  });
  if (!ok) throw new AppError(400, "CODE_INVALID", "Invalid reset code");

  // Emmetre un reset token JWT
  const resetToken = sign(
    { sub: user.id, rid: pr.id }, 
    RESET_SECRET,
    { expiresIn: RESET_TTL } 
  );
  return { resetToken };
}

export async function forgotPasswordReset(
  resetToken: string,
  newPassword: string
) {
  console.log('[DEBUG RESET] ', {
    hasToken: !!resetToken,
    tokenLen: resetToken?.length,
  });
  try {
    const p: any = verify(resetToken, RESET_SECRET);
    console.log('[DEBUG RESET] token valid', p);
  } catch (e) {
    console.log('[DEBUG RESET] JWT verification failed', (e as any)?.message);
    throw new AppError(400, "INVALID_RESET_TOKEN", 'Reset token invalid');
  }
  let payload: any;
  try {
    payload = verify(resetToken, RESET_SECRET);
  } catch {
    throw new AppError(400, "INVALID_RESET_TOKEN");
  }

  const { sub: userId, rid } = payload ?? {};
  if (!userId || !rid) throw new AppError(400, "INVALID_RESET_TOKEN");

  const pr = await prisma.passwordReset.findUnique({ where: { id: rid } });
  if (!pr || pr.userId !== userId)
    throw new AppError(400, "INVALID_RESET_TOKEN");
  if (!pr.verifiedAt) throw new AppError(400, "RESET_NOT_VERIFIED");
  if (pr.completedAt) throw new AppError(400, "RESET_ALREADY_DONE");

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.isActive) throw new AppError(400, "INVALID_RESET_TOKEN");

  const same = await bcrypt.compare(newPassword, user.passwordHash);
  if (same) throw new AppError(400, "PASSWORD_UNCHANGED");

  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: { passwordHash, mustChangePassword: false, updatedAt: new Date() },
    });

    await tx.passwordReset.update({
      where: { id: rid },
      data: { completedAt: new Date() },
    });

    await tx.refreshToken
      .deleteMany({ where: { userId: user.id } })
      .catch(() => {});
  });

  await sendPasswordChangedMail(user.email);
}
