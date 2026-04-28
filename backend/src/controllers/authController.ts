import type { Request, Response } from "express";
import bcrypt from "bcrypt";
import { BCRYPT_SALT_ROUNDS } from "../config.js";
import {
  issueEmailVerificationToken,
  issuePasswordResetToken,
  hashOpaqueToken,
} from "../lib/accountTokens.js";
import {
  buildAppUrl,
  sendEmailVerificationEmail,
  sendPasswordResetEmail,
} from "../lib/email.js";
import {
  clearAuthCookie,
  createAuthResponse,
  setAuthCookie,
  signAuthToken,
} from "../lib/auth.js";
import { AppError } from "../lib/errors.js";
import { prisma } from "../lib/prisma.js";
import { requireUserId } from "../lib/requestContext.js";
import type {
  ForgotPasswordBody,
  LoginBody,
  RegisterBody,
  ResendVerificationBody,
  ResetPasswordBody,
  UpdateProfileBody,
  VerifyEmailBody,
} from "../lib/validation.js";

type PublicUserShape = {
  id: string;
  username: string;
  email: string;
  emailVerifiedAt: Date | null;
};

function toPublicUser(user: PublicUserShape) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    emailVerified: Boolean(user.emailVerifiedAt),
  };
}

async function sendVerificationMessage(user: { id: string; username: string; email: string }) {
  const verification = await issueEmailVerificationToken(user.id);
  const verificationUrl = buildAppUrl("/auth/verify-email", {
    token: verification.token,
  });

  await sendEmailVerificationEmail({
    to: user.email,
    verificationUrl,
    expiresAt: verification.expiresAt,
  });
}

function buildGenericEmailMessage() {
  return "Если аккаунт существует, письмо уже отправлено.";
}

export async function register(req: Request, res: Response) {
  const { username, email, password } = req.body as RegisterBody;

  const existingUsers = await prisma.user.findMany({
    where: {
      OR: [
        { username: { equals: username, mode: "insensitive" } },
        { email },
      ],
    },
    select: {
      username: true,
      email: true,
    },
  });

  if (existingUsers.some((user) => user.username.toLowerCase() === username.toLowerCase())) {
    throw new AppError("Имя уже занято", 409);
  }

  if (existingUsers.some((user) => user.email === email)) {
    throw new AppError("Email уже зарегистрирован", 409);
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      username,
      email,
      passwordHash,
      emailVerifiedAt: null,
      settings: {
        create: {},
      },
    },
    select: {
      id: true,
      username: true,
      email: true,
      emailVerifiedAt: true,
    },
  });

  await sendVerificationMessage(user);

  res.status(201).json({
    message: "Аккаунт создан. Подтвердите email, чтобы войти.",
    requiresEmailVerification: true,
    user: toPublicUser(user),
  });
}

export async function login(req: Request, res: Response) {
  const { login, password } = req.body as LoginBody;

  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { email: login },
        { username: { equals: login, mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      username: true,
      email: true,
      emailVerifiedAt: true,
      passwordHash: true,
    },
  });

  if (!user) {
    throw new AppError("Неверный логин или пароль", 401);
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);

  if (!passwordMatches) {
    throw new AppError("Неверный логин или пароль", 401);
  }

  if (!user.emailVerifiedAt) {
    throw new AppError(
      "Подтвердите email, чтобы войти в аккаунт.",
      403,
      undefined,
      "EMAIL_NOT_VERIFIED",
    );
  }

  const token = signAuthToken(user.id);
  setAuthCookie(res, token);

  res.json(
    createAuthResponse(
      {
        id: user.id,
        username: user.username,
        email: user.email,
        emailVerified: true,
      },
      token,
    ),
  );
}

export async function verifyEmail(req: Request, res: Response) {
  const { token } = req.body as VerifyEmailBody;
  const tokenHash = hashOpaqueToken(token);
  const verificationToken = await prisma.emailVerificationToken.findUnique({
    where: { tokenHash },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          email: true,
          emailVerifiedAt: true,
        },
      },
    },
  });

  if (!verificationToken || verificationToken.consumedAt) {
    throw new AppError("Ссылка подтверждения недействительна или уже использована.", 400, undefined, "INVALID_TOKEN");
  }

  if (verificationToken.expiresAt.getTime() <= Date.now()) {
    throw new AppError("Срок действия ссылки подтверждения истёк.", 410, undefined, "TOKEN_EXPIRED");
  }

  const consumedAt = new Date();
  const [, user] = await prisma.$transaction([
    prisma.emailVerificationToken.updateMany({
      where: {
        userId: verificationToken.userId,
        consumedAt: null,
      },
      data: {
        consumedAt,
      },
    }),
    prisma.user.update({
      where: { id: verificationToken.userId },
      data: {
        emailVerifiedAt: verificationToken.user.emailVerifiedAt ?? consumedAt,
      },
      select: {
        id: true,
        username: true,
        email: true,
        emailVerifiedAt: true,
      },
    }),
  ]);

  res.json({
    success: true,
    message: "Email подтверждён. Теперь можно войти.",
    user: toPublicUser(user),
  });
}

export async function resendVerificationEmail(req: Request, res: Response) {
  const { login } = req.body as ResendVerificationBody;
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { email: login },
        { username: { equals: login, mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      username: true,
      email: true,
      emailVerifiedAt: true,
    },
  });

  if (user && !user.emailVerifiedAt) {
    await sendVerificationMessage(user);
  }

  res.json({
    success: true,
    message: "Если аккаунт существует и почта ещё не подтверждена, мы отправили письмо.",
  });
}

export async function forgotPassword(req: Request, res: Response) {
  const { email } = req.body as ForgotPasswordBody;
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
    },
  });

  if (user) {
    const resetToken = await issuePasswordResetToken(user.id);
    const resetUrl = buildAppUrl("/auth/reset-password", {
      token: resetToken.token,
    });

    await sendPasswordResetEmail({
      to: user.email,
      resetUrl,
      expiresAt: resetToken.expiresAt,
    });
  }

  res.json({
    success: true,
    message: buildGenericEmailMessage(),
  });
}

export async function resetPassword(req: Request, res: Response) {
  const { token, password } = req.body as ResetPasswordBody;
  const tokenHash = hashOpaqueToken(token);
  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    select: {
      id: true,
      userId: true,
      consumedAt: true,
      expiresAt: true,
    },
  });

  if (!resetToken || resetToken.consumedAt) {
    throw new AppError("Ссылка восстановления недействительна или уже использована.", 400, undefined, "INVALID_TOKEN");
  }

  if (resetToken.expiresAt.getTime() <= Date.now()) {
    throw new AppError("Срок действия ссылки восстановления истёк.", 410, undefined, "TOKEN_EXPIRED");
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
  const consumedAt = new Date();

  await prisma.$transaction([
    prisma.passwordResetToken.updateMany({
      where: {
        userId: resetToken.userId,
        consumedAt: null,
      },
      data: {
        consumedAt,
      },
    }),
    prisma.user.update({
      where: { id: resetToken.userId },
      data: {
        passwordHash,
      },
    }),
  ]);

  // JWT sessions are stateless, so other devices stay signed in until token expiry.
  clearAuthCookie(res);

  res.json({
    success: true,
    message: "Пароль обновлён. Войдите с новым паролем.",
  });
}

export async function me(req: Request, res: Response) {
  const userId = requireUserId(req);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      email: true,
      emailVerifiedAt: true,
    },
  });

  if (!user) {
    throw new AppError("Пользователь не найден", 404);
  }

  res.json({ user: toPublicUser(user) });
}

export async function updateProfile(req: Request, res: Response) {
  const { username } = req.body as UpdateProfileBody;
  const userId = requireUserId(req);

  const existingUser = await prisma.user.findFirst({
    where: {
      username: { equals: username, mode: "insensitive" },
      NOT: { id: userId },
    },
    select: {
      id: true,
    },
  });

  if (existingUser) {
    throw new AppError("Имя уже занято", 409);
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: { username },
    select: {
      id: true,
      username: true,
      email: true,
      emailVerifiedAt: true,
    },
  });

  res.json({ user: toPublicUser(user) });
}

export async function logout(_: Request, res: Response) {
  clearAuthCookie(res);
  res.json({ success: true });
}
