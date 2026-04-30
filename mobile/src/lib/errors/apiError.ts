import axios from "axios";
import type { ApiError, ApiErrorDetail } from "../../types/api";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isApiError(value: unknown): value is ApiError {
  return (
    isRecord(value) &&
    typeof value.message === "string" &&
    typeof value.isNetworkError === "boolean" &&
    typeof value.isTimeoutError === "boolean" &&
    Array.isArray(value.details)
  );
}

function toDetails(value: unknown): ApiErrorDetail[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!isRecord(item) || typeof item.path !== "string") {
        return null;
      }

      return {
        path: item.path,
        message: typeof item.message === "string" ? item.message : "",
      };
    })
    .filter((item): item is ApiErrorDetail => item !== null);
}

function getStatusMessage(status: number | null) {
  switch (status) {
    case 400:
      return "Запрос не прошёл проверку.";
    case 401:
      return "Требуется авторизация.";
    case 403:
      return "Недостаточно прав для выполнения действия.";
    case 404:
      return "Данные не найдены.";
    case 409:
      return "Возник конфликт данных.";
    case 429:
      return "Слишком много запросов. Попробуйте позже.";
    default:
      return "Не удалось выполнить запрос.";
  }
}

export function createApiError(
  message: string,
  options: Partial<Omit<ApiError, "message">> = {},
): ApiError {
  return {
    code: options.code ?? null,
    status: options.status ?? null,
    message,
    details: options.details ?? [],
    isNetworkError: options.isNetworkError ?? false,
    isTimeoutError: options.isTimeoutError ?? false,
  };
}

export function normalizeApiError(error: unknown): ApiError {
  if (isApiError(error)) {
    return error;
  }

  if (axios.isAxiosError(error)) {
    const status = error.response?.status ?? null;
    const isTimeoutError = error.code === "ECONNABORTED";
    const isNetworkError = !error.response;
    const payload =
      isRecord(error.response?.data) && isRecord(error.response?.data.error)
        ? error.response.data.error
        : null;
    const code = payload && typeof payload.code === "string" ? payload.code : null;
    const payloadMessage = payload && typeof payload.message === "string" ? payload.message : null;

    if (isTimeoutError) {
      return createApiError(payloadMessage ?? "Сервер не ответил вовремя.", {
        status,
        code,
        isNetworkError,
        isTimeoutError: true,
        details: toDetails(payload?.details),
      });
    }

    if (isNetworkError) {
      return createApiError(payloadMessage ?? "Не удалось подключиться к серверу.", {
        status,
        code,
        isNetworkError: true,
        isTimeoutError,
        details: toDetails(payload?.details),
      });
    }

    return createApiError(payloadMessage ?? getStatusMessage(status), {
      status,
      code,
      isNetworkError,
      isTimeoutError,
      details: toDetails(payload?.details),
    });
  }

  if (error instanceof Error) {
    return createApiError(error.message || "Произошла непредвиденная ошибка.");
  }

  return createApiError("Произошла непредвиденная ошибка.");
}
