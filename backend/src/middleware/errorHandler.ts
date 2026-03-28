import type { ErrorRequestHandler, RequestHandler } from "express";
import { AppError, isPrismaKnownRequestError } from "../lib/errors.js";

function buildErrorPayload(error: AppError) {
  return {
    message: error.message,
    ...(error.details ? { details: error.details } : {}),
  };
}

export const notFoundHandler: RequestHandler = (req, _, next) => {
  next(new AppError(`Маршрут ${req.method} ${req.originalUrl} не найден`, 404));
};

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      error: buildErrorPayload(error),
    });
    return;
  }

  if (isPrismaKnownRequestError(error)) {
    if (error.code === "P2002") {
      res.status(409).json({
        error: {
          message: "Нарушено ограничение уникальности",
        },
      });
      return;
    }

    if (error.code === "P2025") {
      res.status(404).json({
        error: {
          message: "Запись не найдена",
        },
      });
      return;
    }
  }

  console.error("Необработанная ошибка:", error);

  res.status(500).json({
    error: {
      message: "Внутренняя ошибка сервера",
    },
  });
};
