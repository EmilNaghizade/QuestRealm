import { Router } from "express";
import { AppError } from "../../lib/app-error.js";
import { findSession } from "../auth/session.js";
import { getAchievements } from "./achievements.service.js";
export const achievementsRouter=Router();
achievementsRouter.get("/",async(request,response,next)=>{
  response.setHeader("Cache-Control","no-store");
  try { const session=await findSession(request); if(!session)throw new AppError(401,"UNAUTHENTICATED","Please sign in to continue."); response.json({data:await getAchievements(session.userId)}); }
  catch(error){ next(error); }
});
