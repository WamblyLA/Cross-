import { request } from "../../lib/api/request";
import type {
  AuthSettings,
  AuthUser,
  LoginPayload,
  RegisterPayload,
  UpdateSettingsPayload,
} from "./authTypes";

type AuthResponse = {
  token: string;
  expiresIn: string;
  user: AuthUser;
};

type MeResponse = {
  user: AuthUser;
};

type SettingsResponse = {
  settings: AuthSettings;
};

export function register(payload: RegisterPayload) {
  return request<AuthResponse, RegisterPayload>({
    url: "/api/auth/register",
    method: "POST",
    body: payload,
  });
}

export function login(payload: LoginPayload) {
  return request<AuthResponse, LoginPayload>({
    url: "/api/auth/login",
    method: "POST",
    body: payload,
  });
}

export function logout() {
  return request<{ success: true }>({
    url: "/api/auth/logout",
    method: "POST",
  });
}

export function fetchMe() {
  return request<MeResponse>({
    url: "/api/me",
  });
}

export function fetchSettings() {
  return request<SettingsResponse>({
    url: "/api/me/settings",
  });
}

export function updateSettings(payload: UpdateSettingsPayload) {
  return request<SettingsResponse, UpdateSettingsPayload>({
    url: "/api/me/settings",
    method: "PUT",
    body: payload,
  });
}
