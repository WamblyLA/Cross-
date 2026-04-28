import { request } from "../../lib/api/request";
import type {
  AuthSettings,
  AuthUser,
  ForgotPasswordPayload,
  GenericSuccessResponse,
  LoginPayload,
  RegisterPayload,
  RegisterResponse,
  ResendVerificationPayload,
  ResetPasswordPayload,
  UpdateProfilePayload,
  UpdateSettingsPayload,
  VerifyEmailPayload,
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
  return request<RegisterResponse, RegisterPayload>({
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

export function verifyEmail(payload: VerifyEmailPayload) {
  return request<GenericSuccessResponse, VerifyEmailPayload>({
    url: "/api/auth/verify-email",
    method: "POST",
    body: payload,
  });
}

export function resendVerification(payload: ResendVerificationPayload) {
  return request<GenericSuccessResponse, ResendVerificationPayload>({
    url: "/api/auth/resend-verification",
    method: "POST",
    body: payload,
  });
}

export function forgotPassword(payload: ForgotPasswordPayload) {
  return request<GenericSuccessResponse, ForgotPasswordPayload>({
    url: "/api/auth/forgot-password",
    method: "POST",
    body: payload,
  });
}

export function resetPassword(payload: ResetPasswordPayload) {
  return request<GenericSuccessResponse, ResetPasswordPayload>({
    url: "/api/auth/reset-password",
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

export function updateProfile(payload: UpdateProfilePayload) {
  return request<MeResponse, UpdateProfilePayload>({
    url: "/api/me",
    method: "PUT",
    body: payload,
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
