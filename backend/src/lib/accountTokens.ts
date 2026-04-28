import crypto from "node:crypto";
import {
  EMAIL_VERIFICATION_TTL_HOURS,
  PASSWORD_RESET_TTL_HOURS,
} from "../config.js";
import { prisma } from "./prisma.js";

function createRawToken() {
  return crypto.randomBytes(32).toString("base64url");
}

export function hashOpaqueToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function addHours(hours: number) {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

export async function issueEmailVerificationToken(userId: string) {
  const token = createRawToken();
  const tokenHash = hashOpaqueToken(token);
  const expiresAt = addHours(EMAIL_VERIFICATION_TTL_HOURS);
  const consumedAt = new Date();

  await prisma.$transaction([
    prisma.emailVerificationToken.updateMany({
      where: {
        userId,
        consumedAt: null,
      },
      data: {
        consumedAt,
      },
    }),
    prisma.emailVerificationToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
      },
    }),
  ]);

  return {
    token,
    expiresAt,
  };
}

export async function issuePasswordResetToken(userId: string) {
  const token = createRawToken();
  const tokenHash = hashOpaqueToken(token);
  const expiresAt = addHours(PASSWORD_RESET_TTL_HOURS);
  const consumedAt = new Date();

  await prisma.$transaction([
    prisma.passwordResetToken.updateMany({
      where: {
        userId,
        consumedAt: null,
      },
      data: {
        consumedAt,
      },
    }),
    prisma.passwordResetToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
      },
    }),
  ]);

  return {
    token,
    expiresAt,
  };
}
