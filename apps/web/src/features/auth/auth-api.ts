import { apiRequest } from "../../lib/api";

export type AuthUser = {
  id: string;
  displayName: string;
  email: string;
  timeZone: string;
  characterId: string | null;
  xp: number;
  gold: number;
};

type AuthResponse = {
  data: {
    user: AuthUser;
  };
};

export type LoginInput = {
  email: string;
  password: string;
};

export type RegisterInput = LoginInput & {
  displayName: string;
  timeZone: string;
};

export async function getCurrentUser(signal?: AbortSignal): Promise<AuthUser> {
  const response = await apiRequest<AuthResponse>("/auth/me", {
    signal,
  });

  return response.data.user;
}

export async function login(input: LoginInput): Promise<AuthUser> {
  const response = await apiRequest<AuthResponse>("/auth/login", {
    method: "POST",
    json: input,
  });

  return response.data.user;
}

export async function register(input: RegisterInput): Promise<AuthUser> {
  const response = await apiRequest<AuthResponse>("/auth/register", {
    method: "POST",
    json: input,
  });

  return response.data.user;
}

export async function logout(): Promise<void> {
  await apiRequest<void>("/auth/logout", {
    method: "POST",
    json: {},
  });
}
