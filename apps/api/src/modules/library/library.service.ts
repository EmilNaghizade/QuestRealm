import {Types} from "mongoose";
import {AppError} from "../../lib/app-error.js";
import {User} from "../auth/user.model.js";
import {Reading,type ReadingRecord} from "./reading.model.js";
import type {ReadingInput} from "./library.validation.js";
const PAGE_SIZE=20;
function serialize(item:ReadingRecord&{_id:Types.ObjectId}){return{id:item._id.toString(),title:item.title,author:item.author,kind:item.kind,sourceUrl:item.sourceUrl,totalPages:item.totalPages,currentPage:item.currentPage,status:item.status,notes:item.notes,createdAt:item.createdAt.toISOString()};}
export function normalizeReading(input:ReadingInput):ReadingInput{
  if(input.status==="finished")return{...input,currentPage:input.totalPages??input.currentPage};
  if(input.totalPages!==null&&input.currentPage===input.totalPages)return{...input,status:"finished"};
  if(input.status==="planned"&&input.currentPage>0)return{...input,status:"reading"};
  return input;
}
export function readingFilter(userId:Types.ObjectId,cursor?:string,filters:{status?:ReadingInput["status"];q?:string}={}){
  const query=filters.q?.trim().replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
  return {userId,deletedAt:null,...(cursor?{_id:{$lt:new Types.ObjectId(cursor)}}:{}),...(filters.status?{status:filters.status}:{}),...(query?{$or:[{title:{$regex:query,$options:"i"}},{author:{$regex:query,$options:"i"}}]}:{})};
}
export async function listReadings(userId:Types.ObjectId,cursor?:string,filters:{status?:ReadingInput["status"];q?:string}={}){
  const items=await Reading.find(readingFilter(userId,cursor,filters)).sort({_id:-1}).limit(PAGE_SIZE+1).lean();
  const page=items.slice(0,PAGE_SIZE);return{items:page.map(serialize),nextCursor:items.length>PAGE_SIZE?page.at(-1)!._id.toString():null};
}
export async function createReading(userId:Types.ObjectId,input:ReadingInput){return serialize(await Reading.create({userId,...normalizeReading(input)}));}
export async function updateReading(userId:Types.ObjectId,id:string,input:ReadingInput){
  const item=await Reading.findOneAndUpdate({_id:new Types.ObjectId(id),userId,deletedAt:null},{$set:normalizeReading(input)},{new:true,runValidators:true});
  if(!item)throw new AppError(404,"READING_NOT_FOUND","This reading could not be found.");
  if(item.status==="finished")await User.updateOne({_id:userId,selectedReadingId:id},{$set:{selectedReadingId:null}});
  return serialize(item);
}
export async function deleteReading(userId:Types.ObjectId,id:string){
  const result=await Reading.updateOne({_id:new Types.ObjectId(id),userId,deletedAt:null},{$set:{deletedAt:new Date()}});
  if(!result.matchedCount)throw new AppError(404,"READING_NOT_FOUND","This reading could not be found.");
  await User.updateOne({_id:userId,selectedReadingId:id},{$set:{selectedReadingId:null}});
}
export async function getSelectedReading(userId:Types.ObjectId){
  const user=await User.findById(userId).select("selectedReadingId").lean();
  if(!user)throw new AppError(401,"UNAUTHENTICATED","Please sign in to continue.");
  if(!user.selectedReadingId)return null;
  const item=await Reading.findOne({_id:new Types.ObjectId(user.selectedReadingId),userId,deletedAt:null,status:{$ne:"finished"}}).lean();
  return item?serialize(item):null;
}
export async function selectReading(userId:Types.ObjectId,id:string|null){
  if(id){const item=await Reading.findOneAndUpdate({_id:new Types.ObjectId(id),userId,deletedAt:null,status:{$ne:"finished"}},{$set:{status:"reading"}},{new:true});if(!item)throw new AppError(404,"READING_NOT_FOUND","Choose an unfinished reading from your library.");}
  const user=await User.findOneAndUpdate({_id:userId},{$set:{selectedReadingId:id}},{new:true});
  if(!user)throw new AppError(401,"UNAUTHENTICATED","Please sign in to continue.");
  return getSelectedReading(userId);
}
