export type AppPage = "dashboard" | "focus" | "character";

export function getPageFromHash(hash: string): AppPage {
  if (hash === "#focus") return "focus";
  if (hash === "#character") return "character";
  return "dashboard";
}
