import { Router } from "express";
import { z } from "zod";
import { env } from "../../config/env.js";
import { AppError } from "../../lib/app-error.js";
import { findSession } from "../auth/session.js";
import { User } from "../auth/user.model.js";

export const characterRouter = Router();

const characters = [
  {
    id: "knight",
    name: "The Knight",
    role: "Steady and determined",
    description: "Build your realm through patience and perseverance.",
    symbol: "♞",
  },
  {
    id: "ranger",
    name: "The Ranger",
    role: "Curious and independent",
    description: "Find your path, one meaningful step at a time.",
    symbol: "➶",
  },
  {
    id: "mage",
    name: "The Mage",
    role: "Thoughtful and inventive",
    description: "Turn knowledge and focus into everyday progress.",
    symbol: "✧",
  },
  {
    id: "guardian",
    name: "The Guardian",
    role: "Calm and dependable",
    description: "Protect your time and nurture your strongest habits.",
    symbol: "⬡",
  },
  {
    id: "rogue",
    name: "The Rogue",
    role: "Resourceful and adaptable",
    description: "Meet new challenges with a clever approach.",
    symbol: "◇",
  },
  {
    id: "bard",
    name: "The Bard",
    role: "Creative and spirited",
    description: "Make space for inspiration and write your own story.",
    symbol: "♫",
  },
] as const;

const selectionSchema = z
  .object({
    characterId: z
      .string()
      .refine(
        (value) => characters.some((character) => character.id === value),
        "Choose one of the available characters.",
      ),
  })
  .strict();

characterRouter.use((_request, response, next) => {
  response.setHeader("Cache-Control", "no-store");
  next();
});

characterRouter.get("/", async (request, response, next) => {
  try {
    const session = await findSession(request);

    if (!session) {
      throw new AppError(401, "UNAUTHENTICATED", "Please sign in to continue.");
    }

    const userExists = await User.exists({ _id: session.userId });

    if (!userExists) {
      throw new AppError(401, "UNAUTHENTICATED", "Please sign in to continue.");
    }

    response.json({
      data: { characters },
    });
  } catch (error) {
    next(error);
  }
});

characterRouter.post("/selection", async (request, response, next) => {
  try {
    if (request.get("origin") !== env.WEB_ORIGIN) {
      throw new AppError(
        403,
        "ORIGIN_NOT_ALLOWED",
        "The request origin is not allowed.",
      );
    }

    if (!request.is("application/json")) {
      throw new AppError(
        415,
        "JSON_REQUIRED",
        "Use application/json for this request.",
      );
    }

    const session = await findSession(request);

    if (!session) {
      throw new AppError(401, "UNAUTHENTICATED", "Please sign in to continue.");
    }

    const result = selectionSchema.safeParse(request.body);

    if (!result.success) {
      throw new AppError(
        400,
        "VALIDATION_ERROR",
        result.error.issues[0]?.message ?? "Choose a character.",
      );
    }

    const user = await User.findOneAndUpdate(
      {
        _id: session.userId,
        characterId: null,
      },
      {
        $set: {
          characterId: result.data.characterId,
        },
      },
      {
        new: true,
        runValidators: true,
      },
    );

    if (!user) {
      const existingUser = await User.exists({
        _id: session.userId,
      });

      if (!existingUser) {
        throw new AppError(
          401,
          "UNAUTHENTICATED",
          "Please sign in to continue.",
        );
      }

      throw new AppError(
        409,
        "CHARACTER_ALREADY_SELECTED",
        "Your character has already been selected. Refresh to continue.",
      );
    }

    response.json({
      data: {
        characterId: user.characterId,
      },
    });
  } catch (error) {
    next(error);
  }
});
