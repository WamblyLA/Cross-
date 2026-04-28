export type SessionStatus = "idle" | "checking" | "authenticated" | "anonymous";

export type AuthUser = {
  id: string;
  username: string;
  email: string;
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

export type AuthResponse = {
  token: string;
  expiresIn: string;
  user: AuthUser;
};
