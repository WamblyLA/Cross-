import { request } from "../../lib/api/apiClient";
import type {
  AuthResponse,
  AuthUser,
  LoginPayload,
  RegisterPayload,
  RegisterResponse,
} from "../../types/auth";

type MeResponse = {
  user: AuthUser;
};

type GenericSuccessResponse = {
  success: true;
  message: string;
};

export function login(payload: LoginPayload) {
  return request<AuthResponse, LoginPayload>({
    url: "/api/auth/login",
    method: "POST",
    body: payload,
    skipAuthHandling: true,
  });
}

export function register(payload: RegisterPayload) {
  return request<RegisterResponse, RegisterPayload>({
    url: "/api/auth/register",
    method: "POST",
    body: payload,
    skipAuthHandling: true,
  });
}

export function resendVerification(login: string) {
  return request<GenericSuccessResponse, { login: string }>({
    url: "/api/auth/resend-verification",
    method: "POST",
    body: { login },
    skipAuthHandling: true,
  });
}

export function forgotPassword(email: string) {
  return request<GenericSuccessResponse, { email: string }>({
    url: "/api/auth/forgot-password",
    method: "POST",
    body: { email },
    skipAuthHandling: true,
  });
}

export function logout() {
  return request<{ success: boolean }>({
    url: "/api/auth/logout",
    method: "POST",
    skipAuthHandling: true,
  });
}

export function fetchMe() {
  return request<MeResponse>({
    url: "/api/me",
  });
}
