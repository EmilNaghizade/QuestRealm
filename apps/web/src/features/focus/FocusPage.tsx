import ReadingCompanion from "../library/ReadingCompanion";
import FocusCenter from "./FocusCenter";
import FocusStatsPanel from "./FocusStatsPanel";
import { useFocus } from "./focus-context";

export default function FocusPage({onSessionExpired}:{onSessionExpired:()=>void}) {
  const { timer } = useFocus();

  return (
    <div className="focus-center-layout">
      <ReadingCompanion onSessionExpired={onSessionExpired}/>
      <FocusCenter />

      {timer && <FocusStatsPanel />}
    </div>
  );
}
