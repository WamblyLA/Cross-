import axios from "axios";

export type ApiErrorDetail = {
  path: string;
  message: string;
};

export type ApiError = {
  message: string;
  status: number | null;
  details: ApiErrorDetail[];
  isNetworkError: boolean;
  isTimeoutError: boolean;
  originalError: Record<string, unknown> | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toDetail(value: unknown): ApiErrorDetail | null {
  if (!isRecord(value) || typeof value.message !== "string") {
    return null;
  }

  return {
    path: typeof value.path === "string" ? value.path : "",
    message: value.message,
  };
}

function serializeError(error: unknown): Record<string, unknown> | null {
  if (axios.isAxiosError(error)) {
    return {
      name: error.name,
      message: error.message,
      code: error.code ?? null,
      status: error.response?.status ?? null,
      isAxiosError: true,
    };
  }

  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
    };
  }

  if (isRecord(error)) {
    return error;
  }

  return error == null ? null : { value: String(error) };
}

export function createApiError(
  message: string,
  options: Partial<Omit<ApiError, "message">> = {},
): ApiError {
  return {
    message,
    status: options.status ?? null,
    details: options.details ?? [],
    isNetworkError: options.isNetworkError ?? false,
    isTimeoutError: options.isTimeoutError ?? false,
    originalError: options.originalError ?? null,
  };
}

export function isApiError(error: unknown): error is ApiError {
  return isRecord(error) && typeof error.message === "string" && Array.isArray(error.details);
}

export function normalizeApiError(error: unknown): ApiError {
  if (isApiError(error)) {
    return error;
  }

  if (axios.isAxiosError(error)) {
    const status = error.response?.status ?? null;
    const responseData = error.response?.data;
    const errorPayload =
      isRecord(responseData) && isRecord(responseData.error) ? responseData.error : null;
    const details = Array.isArray(errorPayload?.details)
      ? errorPayload.details
          .map(toDetail)
          .filter((detail): detail is ApiErrorDetail => detail !== null)
      : [];
    const isTimeoutError = error.code === "ECONNABORTED";
    const isNetworkError = !error.response;

    let message = "Не удалось выполнить запрос.";

    if (typeof errorPayload?.message === "string") {
      message = errorPayload.message;
    } else if (isTimeoutError) {
      message = "Сервер не ответил вовремя.";
    } else if (isNetworkError) {
      message = "Не удалось подключиться к серверу.";
    } else if (typeof error.message === "string" && error.message.trim()) {
      message = error.message;
    }

    return createApiError(message, {
      status,
      details,
      isNetworkError,
      isTimeoutError,
      originalError: serializeError(error),
    });
  }

  if (error instanceof Error) {
    return createApiError(error.message, {
      originalError: serializeError(error),
    });
  }

  return createApiError("Произошла непредвиденная ошибка.", {
    originalError: serializeError(error),
  });
}

export function getApiErrorDetail(
  details: ApiErrorDetail[] | undefined,
  path: string,
): string | undefined {
  return details?.find((detail) => detail.path === path)?.message;
}
