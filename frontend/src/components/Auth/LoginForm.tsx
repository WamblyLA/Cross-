import { useEffect, useState } from "react";
import { clearActionError } from "../../features/auth/authSlice";
import { getApiErrorDetail } from "../../lib/api/errorNormalization";
import { useAuth } from "../../hooks/useAuth";
import { useAppDispatch } from "../../store/hooks";
import InputField from "../../ui/InputField";
import PrimaryButton from "../../ui/PrimaryButton";

type LoginFormValues = {
  login: string;
  password: string;
};

function validateLogin(values: LoginFormValues) {
  const errors: Partial<Record<keyof LoginFormValues, string>> = {};

  if (!values.login.trim()) {
    errors.login = "Введите имя пользователя или электронную почту.";
  } else if (values.login.trim().length < 3) {
    errors.login = "Используйте не менее 3 символов.";
  }

  if (!values.password) {
    errors.password = "Введите пароль.";
  }

  return errors;
}

export default function LoginForm() {
  const dispatch = useAppDispatch();
  const { authPending, actionError, login } = useAuth();
  const [values, setValues] = useState<LoginFormValues>({
    login: "",
    password: "",
  });

  useEffect(() => {
    dispatch(clearActionError());
  }, [dispatch]);

  const errors = validateLogin(values);
  const loginError = errors.login ?? getApiErrorDetail(actionError?.details, "login");
  const passwordError = errors.password ?? getApiErrorDetail(actionError?.details, "password");
  const generalError =
    actionError && !loginError && !passwordError ? actionError.message : undefined;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    dispatch(clearActionError());

    if (Object.keys(errors).length > 0) {
      return;
    }

    try {
      await login({
        login: values.login.trim(),
        password: values.password,
      }).unwrap();
    } catch {
      // TODO
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <InputField
        label="Имя пользователя или электронная почта"
        value={values.login}
        onChange={(loginValue) => setValues((current) => ({ ...current, login: loginValue }))}
        error={loginError}
        placeholder="username или user@example.com"
      />

      <InputField
        label="Пароль"
        type="password"
        value={values.password}
        onChange={(passwordValue) =>
          setValues((current) => ({ ...current, password: passwordValue }))
        }
        error={passwordError}
        placeholder="Введите пароль"
      />

      {generalError ? <div className="text-sm text-error">{generalError}</div> : null}

      <PrimaryButton type="submit" disabled={authPending} className="h-11 justify-center">
        {authPending ? "Входим..." : "Войти"}
      </PrimaryButton>
    </form>
  );
}
