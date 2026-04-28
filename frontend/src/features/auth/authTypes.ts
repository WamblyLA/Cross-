import type { ApiError } from "../../lib/api/errorNormalization";
import type { ThemeName } from "../../styles/tokens";

export type SessionStatus = "idle" | "checking" | "authenticated" | "anonymous";

export type AuthUser = {
  id: string;
  username: string;
  email: string;
  emailVerified: boolean;
};

export type AuthSettings = {
  theme: ThemeName;
  fontSize: number;
  tabSize: number;
};

export type LoginPayload = {
  login: string;
  password: string;
};

export type RegisterPayload = {
  username: string;
  email: string;
  password: string;
  passwordConfirm: string;
};

export type VerifyEmailPayload = {
  token: string;
};

export type ResendVerificationPayload = {
  login: string;
};

export type ForgotPasswordPayload = {
  email: string;
};

export type ResetPasswordPayload = {
  token: string;
  password: string;
  passwordConfirm: string;
};

export type UpdateProfilePayload = {
  username: string;
};

export type UpdateSettingsPayload = Partial<AuthSettings>;

export type RegisterResponse = {
  message: string;
  requiresEmailVerification: true;
  user: AuthUser;
};

export type GenericSuccessResponse = {
  success: true;
  message: string;
};

export type PendingVerificationState = {
  login: string | null;
  email: string | null;
  message: string | null;
};

export type AuthState = {
  sessionStatus: SessionStatus;
  user: AuthUser | null;
  settings: AuthSettings | null;
  authPending: boolean;
  settingsPending: boolean;
  sessionError: ApiError | null;
  actionError: ApiError | null;
  pendingVerification: PendingVerificationState | null;
};
