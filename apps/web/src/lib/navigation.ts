export type AppPage = "dashboard" | "focus" | "character" | "kingdoms" | "profile" | "settings" | "achievements" | "library";

export function getPageFromHash(hash: string): AppPage {
  if (hash === "#focus") return "focus";
  if (hash === "#character") return "character";
  if (hash === "#kingdoms") return "kingdoms";
  if (hash === "#profile") return "profile";
  if (hash === "#settings") return "settings";
  if (hash === "#achievements") return "achievements";
  if(hash==="#library")return "library";
  return "dashboard";
}
