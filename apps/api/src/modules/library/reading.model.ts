import {Schema,model,type Types} from "mongoose";
export interface ReadingRecord {
  userId:Types.ObjectId;title:string;author:string;kind:"book"|"article";sourceUrl:string;
  totalPages:number|null;currentPage:number;status:"planned"|"reading"|"finished";notes:string;deletedAt:Date|null;createdAt:Date;updatedAt:Date;
}
const schema=new Schema<ReadingRecord>({
  userId:{type:Schema.Types.ObjectId,required:true,ref:"QuestRealmV2User"},
  title:{type:String,required:true,trim:true,maxlength:160},author:{type:String,default:"",maxlength:120},
  kind:{type:String,enum:["book","article"],required:true},sourceUrl:{type:String,default:"",maxlength:2000},
  totalPages:{type:Number,default:null,min:1,max:100000,validate:(value:number|null)=>value===null||Number.isSafeInteger(value)},
  currentPage:{type:Number,default:0,min:0,max:100000,validate:Number.isSafeInteger},
  status:{type:String,enum:["planned","reading","finished"],default:"planned"},notes:{type:String,default:"",maxlength:10000},deletedAt:{type:Date,default:null},
},{collection:"qr_v2_readings",timestamps:true,strict:"throw"});
schema.index({userId:1,deletedAt:1,_id:-1},{name:"qr_v2_readings_owner_list"});
export const Reading=model<ReadingRecord>("QuestRealmV2Reading",schema);
