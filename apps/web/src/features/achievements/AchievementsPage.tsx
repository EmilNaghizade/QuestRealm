import {useEffect,useState} from "react";
import {ApiError} from "../../lib/api";
import {t,locale} from "../../lib/i18n";
import {getAchievements,type AchievementState} from "./achievements-api";
export default function AchievementsPage({onSessionExpired}:{onSessionExpired:()=>void}){
  const [data,setData]=useState<AchievementState|null>(null);
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);
  const [attempt,setAttempt]=useState(0);
  const [filter,setFilter]=useState<"all"|"earned"|"locked">("all");
  useEffect(()=>{
    let controller:AbortController|null=null;
    async function load(){
      controller?.abort();const request=new AbortController();controller=request;setBusy(true);
      try{ const result=await getAchievements(request.signal);if(!request.signal.aborted){setData(result);setError("");} }
      catch(error){if(request.signal.aborted)return;if(error instanceof ApiError&&error.status===401){onSessionExpired();return;}setError(error instanceof ApiError?error.message:"Unable to load achievements.");}
      finally{if(!request.signal.aborted)setBusy(false);}
    }
    void load();const refresh=()=>{if(document.visibilityState==="visible")void load();};
    const timer=window.setInterval(refresh,60000);document.addEventListener("visibilitychange",refresh);
    return()=>{controller?.abort();window.clearInterval(timer);document.removeEventListener("visibilitychange",refresh);};
  },[attempt,onSessionExpired]);
  if(!data)return <section>{error?<><p role="alert" className="task-error">{t(error)}</p><button type="button" className="button button-secondary" onClick={()=>setAttempt(value=>value+1)}>{t("Try again")}</button></>:<p role="status">{t("Opening your book of achievements…")}</p>}</section>;
  const number=(value:number)=>new Intl.NumberFormat(locale()).format(value);
  const earned=data.achievements.filter(item=>item.unlocked).length;
  const visible=data.achievements.filter(item=>filter==="all"||(filter==="earned"?item.unlocked:!item.unlocked));
  return <div className="achievements-page">
    <section className="streak-panel" aria-labelledby="streak-title"><div className="section-heading"><div><p className="eyebrow">{t("Small steps add up")}</p><h2 id="streak-title">{t("Your daily streak")}</h2></div><button type="button" className="button button-secondary" disabled={busy} onClick={()=>setAttempt(value=>value+1)}>{t(busy?"Refreshing…":"Refresh")}</button></div>
      <dl className="streak-totals"><div><dt>{t("Current streak")}</dt><dd>{t("{0} days",{0:number(data.streak.current)})}</dd></div><div><dt>{t("Longest streak")}</dt><dd>{t("{0} days",{0:number(data.streak.longest)})}</dd></div><div><dt>{t("Earned badges")}</dt><dd>{number(earned)} / {number(data.achievements.length)}</dd></div></dl>
      <p className="streak-status">{t(data.streak.todayComplete?"Today is complete. Your streak is safe.":data.streak.current>0?"Your streak is waiting for today's small step.":"A new streak starts with one small step.")}</p>
      <p className="muted">{t("Complete a quest or a focus session to keep your streak. Dates follow your account time zone.")}</p>
      <ol className="streak-week" aria-label={t("Your last 7 days")}>{data.week.map(day=><li key={day.date} className={day.active?"streak-day streak-day-active":"streak-day"} aria-current={day.date===data.today?"date":undefined}>
        <span className="streak-day-mark" aria-hidden="true">{day.active?"✓":"·"}</span><time dateTime={day.date}>{new Intl.DateTimeFormat(locale(),{weekday:"short",timeZone:"UTC"}).format(new Date(`${day.date}T12:00:00Z`))}</time><span className="auth-sr-only">{day.date}: {t(day.active?"Completed":"No activity")}</span>
      </li>)}</ol><p className="achievement-timezone">{data.timeZone}</p>
    </section>
    {error&&<p className="task-error" role="alert">{t(error)}</p>}
    <section aria-labelledby="badges-title"><div className="section-heading"><h2 id="badges-title">{t("Your achievements")}</h2><span className="achievement-count">{t("{0} of {1} earned",{0:number(earned),1:number(data.achievements.length)})}</span></div>
      <div className="task-tabs" role="group" aria-label={t("Achievement filter")}>{([{id:"all",label:"All"},{id:"earned",label:"Earned"},{id:"locked",label:"In progress"}]as const).map(item=><button type="button" key={item.id} aria-pressed={filter===item.id} onClick={()=>setFilter(item.id)}>{t(item.label)}</button>)}</div>
      <ul className="achievement-list">{visible.map(item=><li key={item.id} className={item.unlocked?"achievement achievement-earned":"achievement"}><span className="achievement-seal" aria-hidden="true">{item.unlocked?"✦":"◇"}</span><div><p className="market-slot">{t(item.unlocked?"Earned":"In progress")}</p><h3>{t(item.name)}</h3><p className="muted">{t(item.description)}</p><progress aria-label={t(item.name)} value={item.progress} max={item.target}/><p className="achievement-progress">{item.unlocked?t("A chapter you have already written."):`${number(item.progress)} / ${number(item.target)}`}</p></div></li>)}</ul>
      {visible.length===0&&<p className="muted achievement-empty">{t(filter==="earned"?"Your first badge is waiting for you.":"Every badge is part of your story.")}</p>}
      <p className="muted achievement-footnote">{t("Earned badges stay with you. Deleting quests does not erase your completed activity. Badges do not grant extra XP or gold.")}</p>
    </section>
  </div>;
}
