export type SessionStatus = "idle" | "checking" | "authenticated" | "anonymous";

export type AuthUser = {
  id: string;
  username: string;
  email: string;
  emailVerified: boolean;
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

export type RegisterResponse = {
  message: string;
  requiresEmailVerification: true;
  user: AuthUser;
};

export type AuthResponse = {
  token: string;
  expiresIn: string;
  user: AuthUser;
};

export type PendingVerificationState = {
  login: string | null;
  email: string | null;
  message: string | null;
};
