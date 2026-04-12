import type { AuthResponse, AuthUser, LoginPayload, RegisterPayload } from "../../types/auth";
import { request } from "../../lib/api/apiClient";

type MeResponse = {
  user: AuthUser;
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
  return request<AuthResponse, RegisterPayload>({
    url: "/api/auth/register",
    method: "POST",
    body: payload,
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
