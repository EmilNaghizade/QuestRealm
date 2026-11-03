# QuestRealm

A gamified productivity PWA that turns everyday progress into an adventure.

Complete quests, earn XP and gold, develop your character, and build consistent focus habits with a persistent Pomodoro timer.

> Actively developed. The productivity features are implemented; the equipment, shop, army, and kingdom systems are planned next.

## Features

### Quests and progression

- Daily and one-time quests.
- Easy, medium, and hard difficulty levels.
- Filters by quest type, difficulty, and completion status.
- Server-calculated XP and gold rewards.
- Character levels and XP progression.
- Transaction-based completion with duplicate reward protection.
- Daily completion tracking in the account’s time zone.

### Focus Center

- Custom focus, short break, and long break durations.
- Start, pause, resume, reset, and mode switching.
- Automatic breaks after focus sessions.
- A long break after every fourth completed focus.
- Server-persisted timer state.
- End-of-session melody with volume and sound controls.
- Daily focus totals, a seven-day chart, and paginated history.

### Account and interface

- Registration, login, and logout.
- Fixed 30-day sessions using HttpOnly cookies.
- Six selectable character classes.
- Light and dark themes.
- Responsive layout with mobile navigation.
- App manifest, home-screen icons, and installation guidance.
- Offline connection notice and a dedicated fallback page.

## Tech stack

| Layer          | Technology                                        |
| -------------- | ------------------------------------------------- |
| Frontend       | React, TypeScript, Vite                           |
| Backend        | Node.js, Express, TypeScript                      |
| Database       | MongoDB, Mongoose                                 |
| Validation     | Zod                                               |
| Authentication | Opaque sessions, HttpOnly cookies, Node.js scrypt |
| Deployment     | Vercel static hosting and Vercel Functions        |

## Project structure

```text
questrealm-v2/
├── api/                      # Vercel function entry point
├── apps/
│   ├── api/
│   │   └── src/
│   │       ├── config/
│   │       ├── lib/
│   │       ├── middleware/
│   │       └── modules/
│   │           ├── auth/
│   │           ├── character/
│   │           ├── focus/
│   │           └── tasks/
│   └── web/
│       ├── public/
│       ├── scripts/
│       └── src/
│           ├── components/
│           ├── features/
│           ├── lib/
│           └── styles/
├── package.json
└── vercel.json
```

## Local development

### Requirements

- Node.js and npm.
- A MongoDB deployment that supports transactions, such as MongoDB Atlas or a local replica set.

### 1. Install dependencies

From the repository root:

```bash
npm ci
```

### 2. Configure the API

Create `apps/api/.env`:

```dotenv
NODE_ENV=development
PORT=4000
WEB_ORIGIN=http://localhost:5173
MONGODB_URI=your-mongodb-connection-string
```

Keep this file out of version control.

### 3. Start the API

```bash
npm run dev:api
```

### 4. Start the frontend

In another terminal:

```bash
npm run dev:web
```

Open `http://localhost:5173`.

During local development, Vite proxies `/api` requests to the API on port `4000`.

## Checks and builds

```bash
npm run lint:web
npm run typecheck:api
npm run build
```

For the standalone production server:

```bash
npm start
```

The standalone server requires production environment variables, including `MONGODB_URI` and `WEB_ORIGIN`.

## Deployment

The Vercel project uses the repository root.

- Build command: `npm run build`
- Frontend output: `apps/web/dist`
- API entry point: `api/handler.ts`

Requests under `/api` are routed to the Express application through a Vercel Function.

Configure `MONGODB_URI` in Vercel’s environment variables. The application can resolve its origin from Vercel’s system environment variables, or use an explicitly configured `WEB_ORIGIN`.

## Design principles

- XP, gold, and rewards are calculated on the server.
- Task completion and reward updates run within a database transaction.
- Focus views share one timer provider.
- Actual timestamps are stored in UTC.
- Daily grouping uses the account’s time zone.
- Completed focus sessions count toward the local day on which they finish.
- Pomodoro sessions are independent of quests and do not grant XP or gold.

## PWA behavior

QuestRealm can be added to the home screen on supported devices.

An internet connection is required to save changes, synchronize the timer, and earn quest rewards.

The service worker caches only the dedicated offline fallback page. It does not cache API responses or account data.

Sound alerts depend on browser permissions and activity. They are not guaranteed while the app is closed, suspended, or the device is locked.

## Roadmap

- [ ] Layered 2D characters with visible equipped items.
- [ ] Character-specific outfits and equipment.
- [ ] Shop, inventory, and equipment management.
- [ ] XP-based kingdom conquest.
- [ ] Recruitable troops and siege mechanics.
- [ ] Focus reading library.
- [ ] Azerbaijani, Turkish, and Russian translations.
- [ ] Friends and shared activities.

## Author

Emil Naghizade
