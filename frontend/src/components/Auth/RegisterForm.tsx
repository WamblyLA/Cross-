import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { clearActionError } from "../../features/auth/authSlice";
import { getApiErrorDetail } from "../../lib/api/errorNormalization";
import { useAuth } from "../../hooks/useAuth";
import { useAppDispatch } from "../../store/hooks";
import InputField from "../../ui/InputField";
import PrimaryButton from "../../ui/PrimaryButton";

type RegisterFormValues = {
  username: string;
  email: string;
  password: string;
  passwordConfirm: string;
};

const USERNAME_PATTERN = /^[\p{L}\p{N}]+(?:[ .'-][\p{L}\p{N}]+)*$/u;

function normalizeUsername(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function isValidEmail(value: string) {
  return /\S+@\S+\.\S+/.test(value);
}

function validateRegister(values: RegisterFormValues) {
  const errors: Partial<Record<keyof RegisterFormValues, string>> = {};
  const normalizedUsername = normalizeUsername(values.username);

  if (!normalizedUsername) {
    errors.username = "Введите имя.";
  } else if (normalizedUsername.length < 3) {
    errors.username = "Используйте не менее 3 символов.";
  } else if (normalizedUsername.length > 32) {
    errors.username = "Используйте не более 32 символов.";
  } else if (!USERNAME_PATTERN.test(normalizedUsername)) {
    errors.username = "Используйте буквы, цифры, пробел, точку, апостроф или дефис.";
  }

  if (!values.email.trim()) {
    errors.email = "Введите адрес электронной почты.";
  } else if (!isValidEmail(values.email.trim())) {
    errors.email = "Введите корректный адрес электронной почты.";
  }

  if (!values.password) {
    errors.password = "Введите пароль.";
  } else if (values.password.length < 8) {
    errors.password = "Используйте не менее 8 символов.";
  }

  if (!values.passwordConfirm) {
    errors.passwordConfirm = "Подтвердите пароль.";
  } else if (values.password !== values.passwordConfirm) {
    errors.passwordConfirm = "Пароли не совпадают.";
  }

  return errors;
}

export default function RegisterForm() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { authPending, actionError, register } = useAuth();
  const [values, setValues] = useState<RegisterFormValues>({
    username: "",
    email: "",
    password: "",
    passwordConfirm: "",
  });

  useEffect(() => {
    dispatch(clearActionError());
  }, [dispatch]);

  const errors = validateRegister(values);
  const usernameError = errors.username ?? getApiErrorDetail(actionError?.details, "username");
  const emailError = errors.email ?? getApiErrorDetail(actionError?.details, "email");
  const passwordError = errors.password ?? getApiErrorDetail(actionError?.details, "password");
  const passwordConfirmError =
    errors.passwordConfirm ?? getApiErrorDetail(actionError?.details, "passwordConfirm");
  const generalError =
    actionError && !usernameError && !emailError && !passwordError && !passwordConfirmError
      ? actionError.message
      : undefined;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    dispatch(clearActionError());

    if (Object.keys(errors).length > 0) {
      return;
    }

    try {
      await register({
        username: normalizeUsername(values.username),
        email: values.email.trim(),
        password: values.password,
        passwordConfirm: values.passwordConfirm,
      }).unwrap();
      navigate("/auth/check-email");
    } catch {
      // Ошибка уже попадает в store.
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <InputField
        label="Имя"
        value={values.username}
        onChange={(username) => setValues((current) => ({ ...current, username }))}
        error={usernameError}
        placeholder="Иван Иванов"
      />

      <InputField
        label="Электронная почта"
        type="email"
        value={values.email}
        onChange={(email) => setValues((current) => ({ ...current, email }))}
        error={emailError}
        placeholder="you@example.com"
      />

      <InputField
        label="Пароль"
        type="password"
        value={values.password}
        onChange={(password) => setValues((current) => ({ ...current, password }))}
        error={passwordError}
        placeholder="Придумайте надёжный пароль"
      />

      <InputField
        label="Подтвердите пароль"
        type="password"
        value={values.passwordConfirm}
        onChange={(passwordConfirm) =>
          setValues((current) => ({ ...current, passwordConfirm }))
        }
        error={passwordConfirmError}
        placeholder="Повторите пароль"
      />

      {generalError ? <div className="text-sm text-error">{generalError}</div> : null}

      <PrimaryButton type="submit" disabled={authPending} className="h-11 justify-center">
        {authPending ? "Создаём аккаунт..." : "Создать аккаунт"}
      </PrimaryButton>
    </form>
  );
}
