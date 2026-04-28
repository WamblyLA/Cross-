import type { PropsWithChildren } from "react";
import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import * as authApi from "../auth/authApi";
import { setApiAuthToken, setUnauthorizedHandler } from "../../lib/api/apiClient";
import { normalizeApiError } from "../../lib/errors/apiError";
import type { ApiError } from "../../types/api";
import type {
  AuthUser,
  LoginPayload,
  PendingVerificationState,
  RegisterPayload,
  SessionStatus,
} from "../../types/auth";
import { clearSessionToken, readSessionToken, writeSessionToken } from "./sessionStorage";

type SessionContextValue = {
  sessionStatus: SessionStatus;
  user: AuthUser | null;
  authPending: boolean;
  sessionNotice: string | null;
  pendingVerification: PendingVerificationState | null;
  clearSessionNotice: () => void;
  setPendingVerification: (value: PendingVerificationState | null) => void;
  clearPendingVerification: () => void;
  login: (payload: LoginPayload) => Promise<ApiError | null>;
  register: (payload: RegisterPayload) => Promise<ApiError | null>;
  logout: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient();
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>("idle");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authPending, setAuthPending] = useState(false);
  const [sessionNotice, setSessionNotice] = useState<string | null>(null);
  const [pendingVerification, setPendingVerification] = useState<PendingVerificationState | null>(null);
  const tokenRef = useRef<string | null>(null);

  const applyAnonymousState = async (notice?: string) => {
    tokenRef.current = null;
    setApiAuthToken(null);
    setUser(null);
    setSessionStatus("anonymous");
    queryClient.clear();
    await clearSessionToken();

    if (notice) {
      setSessionNotice(notice);
    }
  };

  useEffect(() => {
    setUnauthorizedHandler(() => {
      if (!tokenRef.current && !user) {
        return;
      }

      void applyAnonymousState("Сессия истекла, войдите снова.");
    });

    return () => {
      setUnauthorizedHandler(null);
    };
  }, [queryClient, user]);

  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      setSessionStatus("checking");

      const token = await readSessionToken();

      if (!token) {
        if (!cancelled) {
          setSessionStatus("anonymous");
        }
        return;
      }

      tokenRef.current = token;
      setApiAuthToken(token);

      try {
        const { user: nextUser } = await authApi.fetchMe();

        if (cancelled) {
          return;
        }

        setUser(nextUser);
        setSessionStatus("authenticated");
      } catch {
        if (!cancelled) {
          await applyAnonymousState("Сессия истекла, войдите снова.");
        }
      }
    }

    void restoreSession();

    return () => {
      cancelled = true;
    };
  }, []);

  const authenticate = async (token: string, nextUser: AuthUser) => {
    tokenRef.current = token;
    setApiAuthToken(token);
    await writeSessionToken(token);
    setUser(nextUser);
    setSessionNotice(null);
    setPendingVerification(null);
    setSessionStatus("authenticated");
  };

  const login = async (payload: LoginPayload) => {
    setAuthPending(true);
    setSessionNotice(null);

    try {
      const response = await authApi.login(payload);
      await authenticate(response.token, response.user);
      return null;
    } catch (error) {
      const normalizedError = normalizeApiError(error);

      if (normalizedError.code === "EMAIL_NOT_VERIFIED") {
        setPendingVerification({
          login: payload.login.trim(),
          email: payload.login.includes("@") ? payload.login.trim() : null,
          message: normalizedError.message,
        });
      }

      return normalizedError;
    } finally {
      setAuthPending(false);
    }
  };

  const register = async (payload: RegisterPayload) => {
    setAuthPending(true);
    setSessionNotice(null);

    try {
      const response = await authApi.register(payload);
      setPendingVerification({
        login: response.user.email,
        email: response.user.email,
        message: response.message,
      });
      setSessionStatus("anonymous");
      return null;
    } catch (error) {
      return normalizeApiError(error);
    } finally {
      setAuthPending(false);
    }
  };

  const logout = async () => {
    setAuthPending(true);

    try {
      await authApi.logout();
    } catch {
      // logout best-effort
    } finally {
      await applyAnonymousState();
      setAuthPending(false);
    }
  };

  const value = useMemo<SessionContextValue>(
    () => ({
      sessionStatus,
      user,
      authPending,
      sessionNotice,
      pendingVerification,
      clearSessionNotice: () => setSessionNotice(null),
      setPendingVerification,
      clearPendingVerification: () => setPendingVerification(null),
      login,
      register,
      logout,
    }),
    [authPending, pendingVerification, sessionNotice, sessionStatus, user],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const context = useContext(SessionContext);

  if (!context) {
    throw new Error("useSession must be used inside SessionProvider");
  }

  return context;
}
