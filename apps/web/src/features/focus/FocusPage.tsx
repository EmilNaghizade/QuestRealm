import FocusCenter from "./FocusCenter";
import FocusStatsPanel from "./FocusStatsPanel";
import { useFocus } from "./focus-context";

export default function FocusPage() {
  const { timer } = useFocus();

  return (
    <div className="focus-center-layout">
      <FocusCenter />

      {timer && <FocusStatsPanel />}
    </div>
  );
}
