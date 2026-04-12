import type { ApiError } from "../../types/api";

export function getFileLoadErrorMessage(error: ApiError | null | undefined) {
  if (!error) {
    return "Не удалось загрузить файл.";
  }

  if (error.status === 404) {
    return "Файл не найден или больше недоступен.";
  }

  return "Не удалось загрузить файл.";
}

export function getFileSaveErrorMessage(error: ApiError | null | undefined) {
  if (!error) {
    return "Не удалось сохранить файл.";
  }

  if (error.status === 403) {
    return "Недостаточно прав для редактирования.";
  }

  if (error.status === 409) {
    return "Файл изменился на сервере. Обновите его и проверьте правки.";
  }

  return "Не удалось сохранить файл.";
}
