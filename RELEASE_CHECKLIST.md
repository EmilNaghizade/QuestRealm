# QuestRealm release preparation

Prepared on 7 November 2026 (Asia/Baku). No deployment was performed.

## Automated gate

Run from the repository root:

```sh
npm ci --include=dev
npm run check
```

`check` runs the persistent test suite, frontend lint, the Vercel handler type check,
and production frontend/API builds. HTTP tests bind an ephemeral localhost port.
Tests set a dummy MongoDB URI and use model mocks; they never connect to the user's database.

Coverage includes password handling, input validation, ownership boundaries, duplicate
purchase/conquest protection, completed-task locks, streak calendar boundaries,
translations, reading progress, API authentication/origin checks, PWA assets,
offline fallback languages, and desktop/mobile Settings ordering.

## Hosting configuration

- Vercel project root: repository root.
- Install command: `npm ci --include=dev`.
- Build command: `npm run build`.
- Static output: `apps/web/dist`.
- API entry: `api/handler.ts`; API paths use the repository's `vercel.json` rewrite.
- Set `MONGODB_URI` separately for Preview and Production. Use a transaction-capable
  MongoDB deployment; quest reward transactions require it.
- Set `WEB_ORIGIN` to the exact public origin when needed. The app can infer Vercel
  preview/production origins when no explicit value is supplied. Do not reuse a
  production-only origin override for a different preview URL.
- For a standalone server, provide `NODE_ENV=production`, `MONGODB_URI`, and
  `WEB_ORIGIN`, then run `npm start` after building.
- Database startup creates all seven collection indexes, including the library index.
  The database account must be allowed to create indexes. Session TTL and completion
  uniqueness indexes are required for expected behavior.
- Keep `.env` files and credentials out of version control and browser code.

## Checks that require a real staging deployment

Automated checks are not a substitute for these database-backed checks. These have
not been performed against a live deployment during this preparation:

- Use a disposable staging account and separate staging database.
- `/api/v1/health` should return 200. `/api/v1/ready` should return 200 with a database
  connection; it correctly returns 503 when the database is unavailable.
- Register, log in, refresh, and log out over HTTPS. Confirm the production session
  cookie works on the deployed origin.
- Complete a daily and one-time quest. Check XP/gold once, including a repeated
  completion request from another tab. Completed quests must reject edits.
- Buy/equip an item and recruit soldiers. Confirm insufficient funds and duplicate
  purchases do not debit the balance.
- Start a siege, reload or leave the page, wait, and claim its reward once.
- Add/edit/search a reading, select it in Focus, and mark it finished.
- Save profile/time zone/language and sign in on another device. Check all four
  languages, including mobile navigation, Cyrillic text, and the offline fallback.
- Verify daily streak boundaries in the selected time zone using staging data.
- Install the PWA on a phone, test the fallback without connectivity, then reconnect.
- Retain the previous deployment and a current database backup for rollback.

## Scope of the local production smoke check

The compiled frontend and API can be served locally without opening a database
connection to verify the public sign-in screen and static assets. This does not
verify real registration, transactions, or persisted account flows.
