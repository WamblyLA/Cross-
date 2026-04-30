import type { ApiError } from "../../types/api";

export function getProjectsErrorMessage(error: ApiError | null | undefined) {
  if (!error) {
    return "Не удалось загрузить проекты.";
  }

  if (error.isNetworkError) {
    return "Не удалось загрузить проекты. Проверьте подключение к серверу.";
  }

  return "Не удалось загрузить проекты.";
}

export function getProjectErrorMessage(error: ApiError | null | undefined) {
  if (!error) {
    return "Не удалось открыть проект.";
  }

  if (error.status === 404) {
    return "Проект не найден или недоступен.";
  }

  return "Не удалось открыть проект.";
}

export function getMembersErrorMessage(error: ApiError | null | undefined) {
  if (!error) {
    return "Не удалось загрузить участников проекта.";
  }

  if (error.status === 403) {
    return "Недостаточно прав для просмотра участников проекта.";
  }

  return "Не удалось загрузить участников проекта.";
}
