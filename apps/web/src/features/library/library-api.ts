import {apiRequest} from "../../lib/api";
export type ReadingInput={title:string;author:string;kind:"book"|"article";sourceUrl:string;totalPages:number|null;currentPage:number;status:"planned"|"reading"|"finished";notes:string};
export type Reading=ReadingInput&{id:string;createdAt:string};
export type LibraryPage={items:Reading[];nextCursor:string|null};
export async function getLibrary(status:string,query:string,cursor?:string,signal?:AbortSignal):Promise<LibraryPage>{const params=new URLSearchParams();if(status!=="all")params.set("status",status);if(query.trim())params.set("q",query.trim());if(cursor)params.set("cursor",cursor);return(await apiRequest<{data:LibraryPage}>(`/library?${params}`,{signal})).data;}
export async function saveReading(input:ReadingInput,id?:string):Promise<Reading>{return(await apiRequest<{data:{reading:Reading}}>(id?`/library/${id}`:"/library",{method:id?"PATCH":"POST",json:input})).data.reading;}
export async function deleteReading(id:string){await apiRequest(`/library/${id}`,{method:"DELETE"});}
export async function getSelectedReading(signal?:AbortSignal):Promise<Reading|null>{return(await apiRequest<{data:{reading:Reading|null}}>("/library/selected",{signal})).data.reading;}
export async function selectReading(readingId:string|null):Promise<Reading|null>{return(await apiRequest<{data:{reading:Reading|null}}>("/library/selected",{method:"PATCH",json:{readingId}})).data.reading;}
