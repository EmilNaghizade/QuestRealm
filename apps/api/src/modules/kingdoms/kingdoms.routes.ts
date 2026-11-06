import { z } from "zod";
import { Router } from "express";
import { env } from "../../config/env.js";
import { AppError } from "../../lib/app-error.js";
import { findSession } from "../auth/session.js";
import { conquerKingdom, getKingdoms, recruitTroops, startSiege } from "./kingdoms.service.js";
export const kingdomsRouter = Router();
kingdomsRouter.use((request, response, next) => {
  response.setHeader("Cache-Control", "no-store");
  if (!["GET", "HEAD", "OPTIONS"].includes(request.method) && request.get("origin") !== env.WEB_ORIGIN) {
    next(new AppError(403, "ORIGIN_NOT_ALLOWED", "The request origin is not allowed.")); return;
  }
  next();
});
kingdomsRouter.get("/", async (request, response, next) => {
  try {
    const session = await findSession(request);
    if (!session) throw new AppError(401, "UNAUTHENTICATED", "Please sign in to continue.");
    response.json({ data: await getKingdoms(session.userId) });
  } catch (error) { next(error); }
});
kingdomsRouter.post("/:kingdomId/conquer", async (request, response, next) => {
  try {
    const session = await findSession(request);
    if (!session) throw new AppError(401, "UNAUTHENTICATED", "Please sign in to continue.");
    response.json({ data: await conquerKingdom(session.userId, String(request.params.kingdomId)) });
  } catch (error) { next(error); }
});

const recruitmentSchema = z.object({ troopId: z.enum(["militia", "rangers", "knights"]), quantity: z.number().int().min(1).max(20) }).strict();
kingdomsRouter.post("/army/recruit", async (request, response, next) => {
  try {
    const session = await findSession(request);
    if (!session) throw new AppError(401, "UNAUTHENTICATED", "Please sign in to continue.");
    if (!request.is("application/json")) throw new AppError(415, "JSON_REQUIRED", "Use application/json for this request.");
    const result = recruitmentSchema.safeParse(request.body);
    if (!result.success) throw new AppError(400, "INVALID_RECRUITMENT", "Choose a troop and 1–20 recruits.");
    response.json({ data: await recruitTroops(session.userId, result.data.troopId, result.data.quantity) });
  } catch (error) { next(error); }
});
kingdomsRouter.post("/:kingdomId/siege", async (request, response, next) => {
  try {
    const session = await findSession(request);
    if (!session) throw new AppError(401, "UNAUTHENTICATED", "Please sign in to continue.");
    response.json({ data: await startSiege(session.userId, String(request.params.kingdomId)) });
  } catch (error) { next(error); }
});
