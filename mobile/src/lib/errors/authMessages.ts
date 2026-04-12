import type { ApiError } from "../../types/api";

export function getLoginErrorMessage(error: ApiError | null | undefined) {
  if (!error) {
    return "Не удалось войти в аккаунт.";
  }

  if (error.status === 401) {
    return "Неверный логин или пароль.";
  }

  if (error.isNetworkError) {
    return "Не удалось подключиться к серверу. Проверьте адрес backend.";
  }

  return "Не удалось войти в аккаунт.";
}

export function getRegisterErrorMessage(error: ApiError | null | undefined) {
  if (!error) {
    return "Не удалось создать аккаунт.";
  }

  if (error.status === 409) {
    return "Пользователь с таким именем или email уже существует.";
  }

  if (error.isNetworkError) {
    return "Не удалось подключиться к серверу. Проверьте адрес backend.";
  }

  return "Не удалось создать аккаунт.";
}
