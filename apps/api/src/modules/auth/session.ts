import { createHash, randomBytes } from "node:crypto";
import type { CookieOptions, Request, Response } from "express";
import type { Types } from "mongoose";
import { env } from "../../config/env.js";
import { Session } from "./session.model.js";

const COOKIE_NAME =
  env.NODE_ENV === "production"
    ? "__Host-questrealm_session"
    : "questrealm_session";

const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

const cookieOptions: CookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
};

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function readToken(request: Request): string | null {
  const value: unknown = request.cookies?.[COOKIE_NAME];

  if (typeof value !== "string" || !/^[0-9a-f]{64}$/.test(value)) {
    return null;
  }

  return value;
}

export async function findSession(request: Request) {
  const token = readToken(request);

  if (!token) {
    return null;
  }

  return Session.findOne({
    tokenHash: hashToken(token),
    expiresAt: { $gt: new Date() },
  }).lean();
}

export async function createSession(
  request: Request,
  response: Response,
  userId: Types.ObjectId,
): Promise<void> {
  const token = randomBytes(32).toString("hex");

  const session = await Session.create({
    tokenHash: hashToken(token),
    userId,
    expiresAt: new Date(Date.now() + SESSION_DURATION_MS),
  });

  try {
    await revokeSession(request);
  } catch (error) {
    await Session.deleteOne({ _id: session._id });
    throw error;
  }

  response.cookie(COOKIE_NAME, token, {
    ...cookieOptions,
    maxAge: SESSION_DURATION_MS,
  });
}

export async function revokeSession(request: Request): Promise<void> {
  const token = readToken(request);

  if (token) {
    await Session.deleteOne({
      tokenHash: hashToken(token),
    });
  }
}

export function clearSessionCookie(response: Response): void {
  response.clearCookie(COOKIE_NAME, cookieOptions);
}
