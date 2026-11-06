import type { Types } from "mongoose";
import { AppError } from "../../lib/app-error.js";
import { User } from "../auth/user.model.js";
import { TaskCompletion } from "../tasks/task-completion.model.js";
import { FocusSession } from "../focus/focus-session.model.js";
import { getFocusTimer } from "../focus/focus.service.js";
type Day = { date: string; quests: number; focus: number };
const DAY_MS = 86400000;
function stepDate(date: string, delta: number) { return new Date(Date.parse(`${date}T12:00:00Z`) + delta * DAY_MS).toISOString().slice(0,10); }
export function localDate(now: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, year:"numeric",month:"2-digit",day:"2-digit" }).formatToParts(now);
  const part = (type: string) => parts.find(p => p.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}
export function calculateStreak(dates: string[], today: string) {
  const sorted = [...new Set(dates.filter(date => date <= today))].sort();
  const active = new Set(sorted);
  let longest = 0, run = 0, previous = "";
  for (const date of sorted) { run = previous && stepDate(previous,1) === date ? run + 1 : 1; longest = Math.max(longest,run); previous = date; }
  let cursor = active.has(today) ? today : stepDate(today,-1), current = 0;
  while (active.has(cursor)) { current += 1; cursor = stepDate(cursor,-1); }
  return { current, longest, todayComplete: active.has(today) };
}
const badges = [
  { id:"first-quest", name:"The first step", description:"Complete your first quest.", metric:"quests", target:1 },
  { id:"quest-ten", name:"A steady hand", description:"Complete 10 quests.", metric:"quests", target:10 },
  { id:"quest-fifty", name:"Questkeeper", description:"Complete 50 quests.", metric:"quests", target:50 },
  { id:"streak-three", name:"Finding a rhythm", description:"Stay active for 3 consecutive days.", metric:"streak", target:3 },
  { id:"streak-seven", name:"A week of resolve", description:"Stay active for 7 consecutive days.", metric:"streak", target:7 },
  { id:"first-focus", name:"A quiet beginning", description:"Complete your first focus session.", metric:"focus", target:1 },
  { id:"focus-ten", name:"Keeper of time", description:"Complete 10 focus sessions.", metric:"focus", target:10 },
  { id:"first-kingdom", name:"A banner of your own", description:"Conquer your first kingdom.", metric:"kingdoms", target:1 },
] as const;
export function buildAchievementState(days: Day[], timeZone: string, kingdoms: number, earnedIds: string[] = [], now = new Date()) {
  const today = localDate(now,timeZone);
  const totals = { quests: days.reduce((sum,day) => sum+day.quests,0), focus: days.reduce((sum,day) => sum+day.focus,0), kingdoms };
  const streak = calculateStreak(days.filter(day=>day.quests+day.focus>0).map(day=>day.date),today);
  const metrics = { ...totals, streak: streak.longest };
  const achievements = badges.map(badge => {
    const value = metrics[badge.metric], unlocked = earnedIds.includes(badge.id) || value >= badge.target;
    return { ...badge, value, unlocked, progress: unlocked ? badge.target : Math.min(value,badge.target) };
  });
  return { timeZone, today, totals, streak, achievements,
    week: Array.from({length:7},(_,i) => { const date = stepDate(today,i-6), activity = days.find(day=>day.date===date); return { date, quests:activity?.quests??0, focus:activity?.focus??0, active:Boolean(activity && activity.quests+activity.focus>0) }; }) };
}
export async function getAchievements(userId: Types.ObjectId) {
  const user = await User.findById(userId);
  if (!user) throw new AppError(401,"UNAUTHENTICATED","Please sign in to continue.");
  if (!user.characterId) throw new AppError(403,"CHARACTER_REQUIRED","Choose your character first.");
  await getFocusTimer(userId);
  const now = new Date();
  const pipeline = [
    { $match:{ userId, completedAt:{$lte:now} } },
    { $group:{ _id:{$dateToString:{date:"$completedAt",format:"%Y-%m-%d",timezone:user.timeZone}}, count:{$sum:1} } },
  ];
  const [quests,focus] = await Promise.all([
    TaskCompletion.aggregate<{_id:string;count:number}>(pipeline),
    FocusSession.aggregate<{_id:string;count:number}>(pipeline),
  ]);
  const days = new Map<string,Day>();
  for(const item of quests) days.set(item._id,{date:item._id,quests:item.count,focus:0});
  for(const item of focus) { const day = days.get(item._id)??{date:item._id,quests:0,focus:0}; day.focus=item.count; days.set(item._id,day); }
  const state = buildAchievementState([...days.values()],user.timeZone,user.conqueredKingdoms?.length??0,user.achievementIds??[],now);
  const newlyEarned = state.achievements.filter(badge=>badge.unlocked && !user.achievementIds?.includes(badge.id)).map(badge=>badge.id);
  if(newlyEarned.length) await User.updateOne({_id:userId},{$addToSet:{achievementIds:{$each:newlyEarned}}});
  return state;
}
