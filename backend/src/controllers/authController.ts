import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma.js";

function makeToken(userId: string) {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT токен не существует");
  }

  return jwt.sign({ userId }, secret, { expiresIn: "7d" });
}

function setAuthCookie(res: Response, token: string) {
  res.cookie("token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

export async function register(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Нужна и почта, и пароль" });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({ error: "Нужна и почта, и пароль" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
      },
    });

    const token = makeToken(user.id);
    setAuthCookie(res, token);

    return res.json({
      user: {
        id: user.id,
        email: user.email,
      },
    });
  } catch (err) {
    console.error("register error", err);
    return res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
}

export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Нужна и почта, и пароль" });
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(401).json({ error: "Неправильная почта или пароль" });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);

    if (!ok) {
      return res.status(401).json({ error: "Неправильная почта или пароль" });
    }

    const token = makeToken(user.id);
    setAuthCookie(res, token);

    return res.json({
      user: {
        id: user.id,
        email: user.email,
      },
    });
  } catch (err) {
    console.error("login error", err);
    return res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
}

export async function me(req: Request, res: Response) {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: "Не авторизован" });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        id: true,
        email: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "Такой пользователь не найден" });
    }

    return res.json({ user });
  } catch (err) {
    console.error("me error", err);
    return res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
}

export async function logout(_: Request, res: Response) {
  res.clearCookie("token");
  return res.json({ success: true });
}
