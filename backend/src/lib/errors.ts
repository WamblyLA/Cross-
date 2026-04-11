import { Prisma } from "../../generated/prisma/index.js";
import type { ZodError } from "zod";

export type ErrorDetail = {
  path: string;
  message: string;
};

export class AppError extends Error {
  statusCode: number;
  details: ErrorDetail[] | undefined;
  code: string | undefined;

  constructor(message: string, statusCode = 500, details?: ErrorDetail[], code?: string) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.details = details;
    this.code = code;
  }
}

export function formatZodError(error: ZodError) {
  return error.issues.map((issue) => ({
    path: issue.path.join(".") || "request",
    message: issue.message,
  }));
}

export function createValidationError(error: ZodError) {
  return new AppError("Ошибка валидации запроса", 400, formatZodError(error), "VALIDATION_ERROR");
}

export function isPrismaKnownRequestError(
  error: unknown,
): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Prisma.PrismaClientKnownRequestError;
}
