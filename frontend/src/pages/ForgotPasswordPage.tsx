import { useState } from "react";
import { Link } from "react-router-dom";
import * as authApi from "../features/auth/authApi";
import { normalizeApiError } from "../lib/api/errorNormalization";
import InputField from "../ui/InputField";
import PrimaryButton from "../ui/PrimaryButton";

function isValidEmail(value: string) {
  return /\S+@\S+\.\S+/.test(value);
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const emailError =
    email.trim().length === 0
      ? null
      : isValidEmail(email.trim())
        ? null
        : "Введите корректный email.";

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedEmail = email.trim();

    if (!normalizedEmail) {
      setError("Введите email.");
      return;
    }

    if (emailError) {
      setError(emailError);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await authApi.forgotPassword({ email: normalizedEmail });
      setSuccessMessage(response.message);
    } catch (requestError) {
      setError(normalizeApiError(requestError).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <InputField
        label="Электронная почта"
        type="email"
        value={email}
        onChange={setEmail}
        placeholder="you@example.com"
        error={error ?? emailError ?? undefined}
      />

      {successMessage ? (
        <div className="rounded-[10px] border border-default bg-active px-4 py-3 text-sm text-primary">
          {successMessage}
        </div>
      ) : null}

      <PrimaryButton type="submit" disabled={isSubmitting} className="h-11 justify-center">
        {isSubmitting ? "Отправляем..." : "Отправить ссылку"}
      </PrimaryButton>

      <div className="text-sm text-secondary">
        <Link to="/auth/login" className="text-primary">
          Вернуться ко входу
        </Link>
      </div>
    </form>
  );
}
