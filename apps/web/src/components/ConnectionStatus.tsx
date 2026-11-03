import { useEffect, useState } from "react";
import "./connection-status.css";

export default function ConnectionStatus() {
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);

  useEffect(() => {
    function updateConnection() {
      setIsOnline(navigator.onLine);
    }

    window.addEventListener("online", updateConnection);
    window.addEventListener("offline", updateConnection);

    return () => {
      window.removeEventListener("online", updateConnection);
      window.removeEventListener("offline", updateConnection);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div
      className="connection-banner"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="connection-banner-inner">
        <span className="connection-banner-icon" aria-hidden="true">
          !
        </span>

        <div className="connection-banner-copy">
          <strong>You’re offline.</strong>
          <p>
            Reconnect to sync your timer and save changes. Quest rewards require
            a connection.
          </p>
        </div>
      </div>
    </div>
  );
}
