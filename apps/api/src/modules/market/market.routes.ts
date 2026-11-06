import { Router } from "express";
import { z } from "zod";
import { env } from "../../config/env.js";
import { AppError } from "../../lib/app-error.js";
import { findSession } from "../auth/session.js";
import { buyItem, equipItem, getMarket } from "./market.service.js";
export const marketRouter = Router();
const equipmentSchema = z.object({ slot: z.enum(["weapon", "armor", "charm"]), itemId: z.string().max(50).nullable() }).strict();
marketRouter.use((request, response, next) => {
  response.setHeader("Cache-Control", "no-store");
  if (!["GET", "HEAD", "OPTIONS"].includes(request.method) && request.get("origin") !== env.WEB_ORIGIN) {
    next(new AppError(403, "ORIGIN_NOT_ALLOWED", "The request origin is not allowed.")); return;
  }
  next();
});
marketRouter.get("/", async (request, response, next) => {
  try {
    const session = await findSession(request);
    if (!session) throw new AppError(401, "UNAUTHENTICATED", "Please sign in to continue.");
    response.json({ data: await getMarket(session.userId) });
  } catch (error) { next(error); }
});
marketRouter.post("/:itemId/buy", async (request, response, next) => {
  try {
    const session = await findSession(request);
    if (!session) throw new AppError(401, "UNAUTHENTICATED", "Please sign in to continue.");
    response.json({ data: await buyItem(session.userId, String(request.params.itemId)) });
  } catch (error) { next(error); }
});
marketRouter.patch("/equipment", async (request, response, next) => {
  try {
    const session = await findSession(request);
    if (!session) throw new AppError(401, "UNAUTHENTICATED", "Please sign in to continue.");
    if (!request.is("application/json")) throw new AppError(415, "JSON_REQUIRED", "Use application/json for this request.");
    const result = equipmentSchema.safeParse(request.body);
    if (!result.success) throw new AppError(400, "VALIDATION_ERROR", "Choose a valid equipment slot and item.");
    response.json({ data: await equipItem(session.userId, result.data.slot, result.data.itemId) });
  } catch (error) { next(error); }
});
