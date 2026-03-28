import type { ApiError } from "../../lib/api/errorNormalization";
import type { ThemeName } from "../../styles/tokens";

export type SessionStatus = "idle" | "checking" | "authenticated" | "anonymous";

export type AuthUser = {
  id: string;
  username: string;
  email: string;
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

export type UpdateSettingsPayload = Partial<AuthSettings>;

export type AuthState = {
  sessionStatus: SessionStatus;
  user: AuthUser | null;
  settings: AuthSettings | null;
  authPending: boolean;
  settingsPending: boolean;
  sessionError: ApiError | null;
  actionError: ApiError | null;
};
