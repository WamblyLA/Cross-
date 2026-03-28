import type { Request, Response } from "express";
import bcrypt from "bcrypt";
import { BCRYPT_SALT_ROUNDS } from "../config.js";
import {
  clearAuthCookie,
  createAuthResponse,
  setAuthCookie,
  signAuthToken,
} from "../lib/auth.js";
import { AppError } from "../lib/errors.js";
import { prisma } from "../lib/prisma.js";
import type {
  LoginBody,
  RegisterBody,
} from "../lib/validation.js";

function toPublicUser(user: { id: string; username: string; email: string }) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
  };
}

export async function register(req: Request, res: Response) {
  const { username, email, password } = req.body as RegisterBody;

  const existingUsers = await prisma.user.findMany({
    where: {
      OR: [{ username }, { email }],
    },
    select: {
      username: true,
      email: true,
    },
  });

  if (existingUsers.some((user) => user.username === username)) {
    throw new AppError("Имя пользователя уже занято", 409);
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
      settings: {
        create: {},
      },
    },
    select: {
      id: true,
      username: true,
      email: true,
    },
  });

  const token = signAuthToken(user.id);
  setAuthCookie(res, token);

  res.status(201).json(createAuthResponse(toPublicUser(user), token));
}

export async function login(req: Request, res: Response) {
  const { login, password } = req.body as LoginBody;

  const user = await prisma.user.findFirst({
    where: {
      OR: [{ email: login }, { username: login }],
    },
    select: {
      id: true,
      username: true,
      email: true,
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

  const token = signAuthToken(user.id);
  setAuthCookie(res, token);

  res.json(
    createAuthResponse(
      {
        id: user.id,
        username: user.username,
        email: user.email,
      },
      token,
    ),
  );
}

export async function me(req: Request, res: Response) {
  if (!req.userId) {
    throw new AppError("Требуется авторизация", 401);
  }

  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    select: {
      id: true,
      username: true,
      email: true,
    },
  });

  if (!user) {
    throw new AppError("Пользователь не найден", 404);
  }

  res.json({ user });
}

export async function logout(_: Request, res: Response) {
  clearAuthCookie(res);
  res.json({ success: true });
}
