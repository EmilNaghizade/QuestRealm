import type { Language } from "../../lib/i18n";
import { apiRequest } from "../../lib/api";

export type Progression = {
  level: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
  xpRemaining: number;
};

export type PlayerBalance = {
  xp: number;
  gold: number;
  progression: Progression;
};

export type AuthUser = PlayerBalance & {
  id: string;
  displayName: string;
  email: string;
  timeZone: string;
  language: Language;
  characterId: string | null;
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
  language?: Language;
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

export type ProfileInput = Pick<AuthUser, "displayName" | "timeZone" | "language">;
export async function updateProfile(input: ProfileInput): Promise<AuthUser> {
  return (await apiRequest<AuthResponse>("/auth/profile", { method: "PATCH", json: input })).data.user;
}
