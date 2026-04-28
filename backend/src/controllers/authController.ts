import type { Request, Response } from "express";
import bcrypt from "bcrypt";
import { BCRYPT_SALT_ROUNDS } from "../config.js";
import {
  issueEmailVerificationToken,
  issuePasswordResetToken,
  hashOpaqueToken,
} from "../lib/accountTokens.js";
import { renderMessagePage, renderResetPasswordFormPage } from "../lib/authPages.js";
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
import {
  AppError,
  createValidationError,
  formatZodError,
} from "../lib/errors.js";
import { prisma } from "../lib/prisma.js";
import { requireUserId } from "../lib/requestContext.js";
import {
  resetPasswordBodySchema,
  type ForgotPasswordBody,
  type LoginBody,
  type RegisterBody,
  type ResendVerificationBody,
  type UpdateProfileBody,
  type VerifyEmailBody,
} from "../lib/validation.js";

type PublicUserShape = {
  id: string;
  username: string;
  email: string;
  emailVerifiedAt: Date | null;
};

type PasswordResetRecord = {
  id: string;
  userId: string;
  consumedAt: Date | null;
  expiresAt: Date;
};

function toPublicUser(user: PublicUserShape) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    emailVerified: Boolean(user.emailVerifiedAt),
  };
}

function buildGenericEmailMessage() {
  return "Если аккаунт существует, письмо уже отправлено.";
}

function extractSingleValue(value: unknown) {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value) && typeof value[0] === "string") {
    return value[0];
  }

  return "";
}

function isFormSubmission(req: Request) {
  return req.is("application/x-www-form-urlencoded") === "application/x-www-form-urlencoded";
}

function sendHtml(res: Response, statusCode: number, html: string) {
  res.status(statusCode).type("html").send(html);
}

function renderVerificationMessage(
  res: Response,
  statusCode: number,
  message: string,
  tone: "error" | "success",
) {
  sendHtml(
    res,
    statusCode,
    renderMessagePage({
      title: tone === "success" ? "Email подтверждён" : "Ошибка подтверждения",
      message,
      tone,
    }),
  );
}

function renderPasswordResetMessage(
  res: Response,
  statusCode: number,
  title: string,
  message: string,
  tone: "error" | "success",
) {
  sendHtml(
    res,
    statusCode,
    renderMessagePage({
      title,
      message,
      tone,
    }),
  );
}

function renderPasswordResetForm(
  res: Response,
  statusCode: number,
  options: {
    token: string;
    message?: string | null;
    tone?: "error" | "success";
    fieldErrors?: {
      password?: string;
      passwordConfirm?: string;
    };
  },
) {
  sendHtml(res, statusCode, renderResetPasswordFormPage(options));
}

function getResetPasswordFieldErrors(details: { path: string; message: string }[]) {
  return details.reduce<{ password?: string; passwordConfirm?: string }>((accumulator, detail) => {
    if (detail.path === "password") {
      accumulator.password = detail.message;
    }

    if (detail.path === "passwordConfirm" || detail.path === "confirmPassword") {
      accumulator.passwordConfirm = detail.message;
    }

    return accumulator;
  }, {});
}

function buildInvalidVerificationTokenError() {
  return new AppError(
    "Ссылка подтверждения недействительна или уже использована.",
    400,
    undefined,
    "INVALID_TOKEN",
  );
}

function buildExpiredVerificationTokenError() {
  return new AppError(
    "Срок действия ссылки подтверждения истёк.",
    410,
    undefined,
    "TOKEN_EXPIRED",
  );
}

function buildInvalidResetTokenError() {
  return new AppError(
    "Ссылка восстановления недействительна или уже использована.",
    400,
    undefined,
    "INVALID_TOKEN",
  );
}

function buildExpiredResetTokenError() {
  return new AppError(
    "Срок действия ссылки восстановления истёк.",
    410,
    undefined,
    "TOKEN_EXPIRED",
  );
}

async function sendVerificationMessage(user: { id: string; email: string }) {
  const verification = await issueEmailVerificationToken(user.id);
  const verificationUrl = buildAppUrl("/api/auth/verify-email", {
    token: verification.token,
  });

  await sendEmailVerificationEmail({
    to: user.email,
    verificationUrl,
    expiresAt: verification.expiresAt,
  });
}

async function getEmailVerificationToken(token: string) {
  const tokenHash = hashOpaqueToken(token);
  return prisma.emailVerificationToken.findUnique({
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
}

function assertEmailVerificationTokenAvailable(
  verificationToken: Awaited<ReturnType<typeof getEmailVerificationToken>>,
): asserts verificationToken is NonNullable<
  Awaited<ReturnType<typeof getEmailVerificationToken>>
> {
  if (!verificationToken || verificationToken.consumedAt) {
    throw buildInvalidVerificationTokenError();
  }

  if (verificationToken.expiresAt.getTime() <= Date.now()) {
    throw buildExpiredVerificationTokenError();
  }
}

async function verifyEmailByToken(token: string) {
  const verificationToken = await getEmailVerificationToken(token);
  assertEmailVerificationTokenAvailable(verificationToken);

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

  return user;
}

async function getPasswordResetToken(token: string) {
  const tokenHash = hashOpaqueToken(token);
  return prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    select: {
      id: true,
      userId: true,
      consumedAt: true,
      expiresAt: true,
    },
  });
}

function assertPasswordResetTokenAvailable(
  resetToken: PasswordResetRecord | null,
): asserts resetToken is PasswordResetRecord {
  if (!resetToken || resetToken.consumedAt) {
    throw buildInvalidResetTokenError();
  }

  if (resetToken.expiresAt.getTime() <= Date.now()) {
    throw buildExpiredResetTokenError();
  }
}

async function ensurePasswordResetTokenAvailable(token: string) {
  const resetToken = await getPasswordResetToken(token);
  assertPasswordResetTokenAvailable(resetToken);
  return resetToken;
}

async function resetPasswordByToken(token: string, password: string) {
  const resetToken = await ensurePasswordResetTokenAvailable(token);
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
}

export async function register(req: Request, res: Response) {
  const { username, email, password } = req.body as RegisterBody;

  const existingUsers = await prisma.user.findMany({
    where: {
      OR: [{ username: { equals: username, mode: "insensitive" } }, { email }],
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
      OR: [{ email: login }, { username: { equals: login, mode: "insensitive" } }],
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
  const user = await verifyEmailByToken(token);

  res.json({
    success: true,
    message: "Email подтверждён. Теперь можно войти.",
    user: toPublicUser(user),
  });
}

export async function verifyEmailPage(req: Request, res: Response) {
  const token = extractSingleValue(req.query.token);

  if (!token.trim()) {
    renderVerificationMessage(res, 400, "Ссылка подтверждения недействительна.", "error");
    return;
  }

  try {
    await verifyEmailByToken(token);
    renderVerificationMessage(
      res,
      200,
      "Email подтверждён. Можете вернуться в CROSS++.",
      "success",
    );
  } catch (error) {
    if (error instanceof AppError) {
      renderVerificationMessage(res, error.statusCode, error.message, "error");
      return;
    }

    console.error("Ошибка подтверждения email:", error);
    renderVerificationMessage(
      res,
      500,
      "Не удалось подтвердить email. Попробуйте позже.",
      "error",
    );
  }
}

export async function resendVerificationEmail(req: Request, res: Response) {
  const { login } = req.body as ResendVerificationBody;
  const user = await prisma.user.findFirst({
    where: {
      OR: [{ email: login }, { username: { equals: login, mode: "insensitive" } }],
    },
    select: {
      id: true,
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
    const resetUrl = buildAppUrl("/api/auth/reset-password", {
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

export async function resetPasswordPage(req: Request, res: Response) {
  const token = extractSingleValue(req.query.token);

  if (!token.trim()) {
    renderPasswordResetMessage(
      res,
      400,
      "Ошибка восстановления",
      "Ссылка восстановления недействительна.",
      "error",
    );
    return;
  }

  try {
    await ensurePasswordResetTokenAvailable(token);
    renderPasswordResetForm(res, 200, { token });
  } catch (error) {
    if (error instanceof AppError) {
      renderPasswordResetMessage(
        res,
        error.statusCode,
        "Ошибка восстановления",
        error.message,
        "error",
      );
      return;
    }

    console.error("Ошибка открытия формы сброса пароля:", error);
    renderPasswordResetMessage(
      res,
      500,
      "Ошибка восстановления",
      "Не удалось открыть форму сброса пароля. Попробуйте позже.",
      "error",
    );
  }
}

export async function resetPassword(req: Request, res: Response) {
  const formSubmission = isFormSubmission(req);
  const parsedBody = resetPasswordBodySchema.safeParse(req.body);

  if (!parsedBody.success) {
    if (!formSubmission) {
      throw createValidationError(parsedBody.error);
    }

    const details = formatZodError(parsedBody.error);
    renderPasswordResetForm(res, 400, {
      token: extractSingleValue(req.body?.token),
      message: "Проверьте форму и попробуйте снова.",
      tone: "error",
      fieldErrors: getResetPasswordFieldErrors(details),
    });
    return;
  }

  const { token, password } = parsedBody.data;

  try {
    await resetPasswordByToken(token, password);
  } catch (error) {
    if (!formSubmission) {
      throw error;
    }

    if (error instanceof AppError) {
      if (error.code === "INVALID_TOKEN" || error.code === "TOKEN_EXPIRED") {
        renderPasswordResetMessage(
          res,
          error.statusCode,
          "Ошибка восстановления",
          error.message,
          "error",
        );
        return;
      }

      renderPasswordResetForm(res, error.statusCode, {
        token,
        message: error.message,
        tone: "error",
      });
      return;
    }

    console.error("Ошибка сброса пароля:", error);
    renderPasswordResetMessage(
      res,
      500,
      "Ошибка восстановления",
      "Не удалось обновить пароль. Попробуйте позже.",
      "error",
    );
    return;
  }

  // JWT sessions are stateless, so other devices stay signed in until token expiry.
  clearAuthCookie(res);

  if (formSubmission) {
    renderPasswordResetMessage(
      res,
      200,
      "Пароль обновлён",
      "Пароль обновлён. Можете вернуться в CROSS++ и войти с новым паролем.",
      "success",
    );
    return;
  }

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
