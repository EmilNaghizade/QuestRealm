export default function BrandLogo({ compact = false }: { compact?: boolean }) {
  return <span className={`quest-logo${compact ? " quest-logo-compact" : ""}`}>
    <svg className="quest-logo-symbol" width="36" height="36" viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <rect width="48" height="48" rx="12" fill="var(--primary)"/>
      <path d="M32 31A13 13 0 1 1 36 20M21 25l6 6 11-11" stroke="var(--on-primary)" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
    {compact ? <span className="auth-sr-only">QuestRealm</span> : <span className="quest-logo-wordmark">QuestRealm</span>}
  </span>;
}
