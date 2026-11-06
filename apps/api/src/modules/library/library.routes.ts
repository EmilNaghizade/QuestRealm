import {Router} from "express";
import {env} from "../../config/env.js";
import {AppError} from "../../lib/app-error.js";
import {findSession} from "../auth/session.js";
import {User} from "../auth/user.model.js";
import {readingSchema,readingIdSchema,libraryQuerySchema,selectionSchema} from "./library.validation.js";
import {listReadings,createReading,updateReading,deleteReading,getSelectedReading,selectReading} from "./library.service.js";
export const libraryRouter=Router();
libraryRouter.use(async(request,response,next)=>{
  response.setHeader("Cache-Control","no-store");
  try{
    if(!["GET","HEAD","OPTIONS"].includes(request.method)&&request.get("origin")!==env.WEB_ORIGIN)throw new AppError(403,"ORIGIN_NOT_ALLOWED","The request origin is not allowed.");
    const session=await findSession(request);if(!session)throw new AppError(401,"UNAUTHENTICATED","Please sign in to continue.");
    const user=await User.findById(session.userId).select("characterId").lean();if(!user)throw new AppError(401,"UNAUTHENTICATED","Please sign in to continue.");
    if(!user.characterId)throw new AppError(403,"CHARACTER_REQUIRED","Choose your character first.");
    response.locals.libraryUserId=session.userId;next();
  }catch(error){next(error);}
});
function requireJson(request:{is:(type:string)=>unknown}){if(!request.is("application/json"))throw new AppError(415,"JSON_REQUIRED","Use application/json for this request.");}
libraryRouter.get("/",async(request,response,next)=>{try{const query=libraryQuerySchema.safeParse(request.query);if(!query.success)throw new AppError(400,"VALIDATION_ERROR","Invalid library query.");const {cursor,...filters}=query.data;response.json({data:await listReadings(response.locals.libraryUserId,cursor,filters)});}catch(error){next(error);}});
libraryRouter.get("/selected",async(_request,response,next)=>{try{response.json({data:{reading:await getSelectedReading(response.locals.libraryUserId)}});}catch(error){next(error);}});
libraryRouter.patch("/selected",async(request,response,next)=>{try{requireJson(request);const input=selectionSchema.safeParse(request.body);if(!input.success)throw new AppError(400,"VALIDATION_ERROR","Choose a reading from your library.");response.json({data:{reading:await selectReading(response.locals.libraryUserId,input.data.readingId)}});}catch(error){next(error);}});
libraryRouter.post("/",async(request,response,next)=>{try{requireJson(request);const input=readingSchema.safeParse(request.body);if(!input.success)throw new AppError(400,"VALIDATION_ERROR",input.error.issues[0]?.message??"Check your reading details.");response.status(201).json({data:{reading:await createReading(response.locals.libraryUserId,input.data)}});}catch(error){next(error);}});
libraryRouter.patch("/:id",async(request,response,next)=>{try{requireJson(request);const id=readingIdSchema.safeParse(request.params.id),input=readingSchema.safeParse(request.body);if(!id.success||!input.success)throw new AppError(400,"VALIDATION_ERROR",!input.success?input.error.issues[0]?.message??"Check your reading details.":"Invalid reading ID.");response.json({data:{reading:await updateReading(response.locals.libraryUserId,id.data,input.data)}});}catch(error){next(error);}});
libraryRouter.delete("/:id",async(request,response,next)=>{try{const id=readingIdSchema.safeParse(request.params.id);if(!id.success)throw new AppError(400,"VALIDATION_ERROR","Invalid reading ID.");await deleteReading(response.locals.libraryUserId,id.data);response.sendStatus(204);}catch(error){next(error);}});
