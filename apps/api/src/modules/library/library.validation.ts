import { z } from "zod";
export const readingIdSchema=z.string().regex(/^[0-9a-fA-F]{24}$/,"Invalid reading ID.");
export const readingSchema=z.object({
  title:z.string().trim().min(1,"Enter a reading title.").max(160),
  author:z.string().trim().max(120).default(""),
  kind:z.enum(["book","article"]),
  sourceUrl:z.string().trim().max(2000).default("").refine(value=>{if(!value)return true;try{const url=new URL(value);return ["https:","http:"].includes(url.protocol)&&!url.username&&!url.password;}catch{return false;}},"Use a valid http or https link."),
  totalPages:z.number().int().min(1).max(100000).nullable(),
  currentPage:z.number().int().min(0).max(100000),
  status:z.enum(["planned","reading","finished"]),
  notes:z.string().trim().max(10000).default(""),
}).strict().refine(input=>input.totalPages===null||input.currentPage<=input.totalPages,"Current page cannot exceed total pages.");
export type ReadingInput=z.infer<typeof readingSchema>;
export const libraryQuerySchema=z.object({cursor:readingIdSchema.optional(),status:z.enum(["planned","reading","finished"]).optional(),q:z.string().trim().max(160).optional()}).strict();
export const selectionSchema=z.object({readingId:readingIdSchema.nullable()}).strict();
