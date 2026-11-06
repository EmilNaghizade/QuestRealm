import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { registerServiceWorker } from "./lib/register-service-worker";
import "./styles/theme.css";
import "./styles/global.css";

let theme = window.matchMedia("(prefers-color-scheme: dark)").matches
  ? "dark"
  : "light";

try {
  const savedTheme = localStorage.getItem("questrealm.theme");

  if (savedTheme === "light" || savedTheme === "dark") {
    theme = savedTheme;
  }
} catch {
  // Use the system preference when storage is unavailable.
}

document.documentElement.dataset.theme = theme;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

registerServiceWorker();

import "./styles/minimal.css";

import "./styles/motion.css";
