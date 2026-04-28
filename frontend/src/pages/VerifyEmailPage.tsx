import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import * as authApi from "../features/auth/authApi";
import { normalizeApiError } from "../lib/api/errorNormalization";
import { useAuth } from "../hooks/useAuth";

type VerifyStatus = "loading" | "success" | "error";

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const { clearPendingVerification } = useAuth();
  const [status, setStatus] = useState<VerifyStatus>("loading");
  const [message, setMessage] = useState("Проверяем ссылку подтверждения...");

  useEffect(() => {
    const token = searchParams.get("token")?.trim();

    if (!token) {
      setStatus("error");
      setMessage("Ссылка подтверждения недействительна.");
      return;
    }

    const verificationToken = token;

    let cancelled = false;

    async function verify() {
      try {
        const response = await authApi.verifyEmail({ token: verificationToken });

        if (cancelled) {
          return;
        }

        clearPendingVerification();
        setStatus("success");
        setMessage(response.message);
      } catch (requestError) {
        if (cancelled) {
          return;
        }

        setStatus("error");
        setMessage(normalizeApiError(requestError).message);
      }
    }

    void verify();

    return () => {
      cancelled = true;
    };
  }, [clearPendingVerification, searchParams]);

  return (
    <div className="flex flex-col gap-4">
      <div
        className={`rounded-[10px] border px-4 py-3 text-sm ${
          status === "error"
            ? "border-error bg-input text-error"
            : "border-default bg-active text-primary"
        }`}
      >
        {message}
      </div>

      <div className="text-sm text-secondary">
        <Link to="/auth/login" className="text-primary">
          Перейти ко входу
        </Link>
      </div>
    </div>
  );
}
