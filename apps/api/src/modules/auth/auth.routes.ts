import { Router, type RequestHandler } from "express";
import { rateLimit } from "express-rate-limit";
import { MongoServerError } from "mongodb";
import { env } from "../../config/env.js";
import { AppError } from "../../lib/app-error.js";
import { getProgression } from "../character/progression.js";
import { User, type UserRecord } from "./user.model.js";
import { loginSchema, registerSchema } from "./auth.validation.js";
import { hashPassword, verifyPassword } from "./password.js";
import {
  clearSessionCookie,
  createSession,
  findSession,
  revokeSession,
} from "./session.js";

export const authRouter = Router();

function publicUser(user: UserRecord & { _id: { toString(): string } }) {
  return {
    id: user._id.toString(),
    displayName: user.displayName,
    email: user.email,
    timeZone: user.timeZone,
    characterId: user.characterId,
    xp: user.xp,
    gold: user.gold,
    progression: getProgression(user.xp),
  };
}

const requireTrustedOrigin: RequestHandler = (request, _response, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(request.method)) {
    next();
    return;
  }

  if (request.get("origin") !== env.WEB_ORIGIN) {
    next(
      new AppError(
        403,
        "ORIGIN_NOT_ALLOWED",
        "The request origin is not allowed.",
      ),
    );
    return;
  }

  if (!request.is("application/json")) {
    next(
      new AppError(
        415,
        "JSON_REQUIRED",
        "Use application/json for this request.",
      ),
    );
    return;
  }

  next();
};

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    error: {
      code: "TOO_MANY_ATTEMPTS",
      message: "Too many attempts. Please try again later.",
    },
  },
});

let dummyHashPromise: Promise<string> | undefined;

function getDummyHash(): Promise<string> {
  dummyHashPromise ??= hashPassword("unused-dummy-password");

  return dummyHashPromise;
}

authRouter.use((_request, response, next) => {
  response.setHeader("Cache-Control", "no-store");
  next();
});

authRouter.use(requireTrustedOrigin);

authRouter.post("/register", authLimiter, async (request, response, next) => {
  try {
    const result = registerSchema.safeParse(request.body);

    if (!result.success) {
      throw new AppError(
        400,
        "VALIDATION_ERROR",
        result.error.issues[0]?.message ?? "Check your details.",
      );
    }

    const input = result.data;
    const passwordHash = await hashPassword(input.password);

    const user = await User.create({
      displayName: input.displayName,
      email: input.email,
      passwordHash,
      timeZone: input.timeZone,
    });

    await createSession(request, response, user._id);

    response.status(201).json({
      data: {
        user: publicUser(user),
      },
    });
  } catch (error) {
    if (error instanceof MongoServerError && error.code === 11000) {
      next(
        new AppError(
          409,
          "EMAIL_IN_USE",
          "An account with this email already exists.",
        ),
      );
      return;
    }

    next(error);
  }
});

authRouter.post("/login", authLimiter, async (request, response, next) => {
  try {
    const result = loginSchema.safeParse(request.body);

    if (!result.success) {
      throw new AppError(
        400,
        "VALIDATION_ERROR",
        result.error.issues[0]?.message ?? "Check your details.",
      );
    }

    const user = await User.findOne({
      email: result.data.email,
    }).select("+passwordHash");

    const storedHash = user ? user.passwordHash : await getDummyHash();

    const passwordMatches = await verifyPassword(
      result.data.password,
      storedHash,
    );

    if (!user || !passwordMatches) {
      throw new AppError(
        401,
        "INVALID_CREDENTIALS",
        "Email or password is incorrect.",
      );
    }

    await createSession(request, response, user._id);

    response.status(200).json({
      data: {
        user: publicUser(user),
      },
    });
  } catch (error) {
    next(error);
  }
});

authRouter.get("/me", async (request, response, next) => {
  try {
    const session = await findSession(request);

    if (!session) {
      clearSessionCookie(response);

      throw new AppError(401, "UNAUTHENTICATED", "Please sign in to continue.");
    }

    const user = await User.findById(session.userId);

    if (!user) {
      await revokeSession(request);
      clearSessionCookie(response);

      throw new AppError(401, "UNAUTHENTICATED", "Please sign in to continue.");
    }

    response.status(200).json({
      data: {
        user: publicUser(user),
      },
    });
  } catch (error) {
    next(error);
  }
});

authRouter.post("/logout", async (request, response, next) => {
  try {
    await revokeSession(request);
    clearSessionCookie(response);

    response.status(204).end();
  } catch (error) {
    next(error);
  }
});
