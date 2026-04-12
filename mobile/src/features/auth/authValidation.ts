import { validateEmail } from "../../lib/utils/validation";
import type { LoginPayload, RegisterPayload } from "../../types/auth";

export type AuthFormErrors = Partial<Record<keyof RegisterPayload | keyof LoginPayload, string>>;

export function validateLoginPayload(payload: LoginPayload): AuthFormErrors {
  const errors: AuthFormErrors = {};

  if (!payload.login.trim()) {
    errors.login = "Введите логин или email.";
  }

  if (!payload.password) {
    errors.password = "Введите пароль.";
  }

  return errors;
}

export function validateRegisterPayload(payload: RegisterPayload): AuthFormErrors {
  const errors: AuthFormErrors = {};

  if (payload.username.trim().length < 3) {
    errors.username = "Имя должно быть не короче 3 символов.";
  }

  if (!validateEmail(payload.email)) {
    errors.email = "Введите корректный email.";
  }

  if (payload.password.length < 8) {
    errors.password = "Пароль должен быть не короче 8 символов.";
  }

  if (payload.passwordConfirm !== payload.password) {
    errors.passwordConfirm = "Пароли не совпадают.";
  }

  return errors;
}
