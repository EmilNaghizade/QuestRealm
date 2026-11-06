import { apiRequest } from "../../lib/api";
export type AchievementState = {
  timeZone:string; today:string;
  totals:{quests:number;focus:number;kingdoms:number};
  streak:{current:number;longest:number;todayComplete:boolean};
  week:{date:string;quests:number;focus:number;active:boolean}[];
  achievements:{id:string;name:string;description:string;metric:string;target:number;value:number;unlocked:boolean;progress:number}[];
};
export async function getAchievements(signal?:AbortSignal):Promise<AchievementState>{ return (await apiRequest<{data:AchievementState}>("/achievements",{signal})).data; }
