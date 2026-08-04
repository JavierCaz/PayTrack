# AGENTS.md

PayTrack: offline-first React Native app (Expo SDK 54, React 19 / RN 0.81) for tracking installment payments and collections. Stack: expo-router (file-based routing), TypeScript (strict), Zustand, expo-sqlite, dayjs. No backend, no env vars, no tests.

## Commands

- `npm start` / `npm run android|ios|web` — Expo dev server
- `npm run lint` — ESLint (`expo lint`)
- `npx tsc --noEmit` — typecheck (no npm script exists)
- `npm run version` — `expo-version`: bumps `app.json` + `package.json`, then auto-commits and tags. `npm run build:ios|android|all` run this first, so only use them when releasing. Don't hand-edit the version.
- Push to `main` triggers `.github/workflows/build-android-apk.yml` (EAS preview APK build).

## Architecture

- Routes live in `app/**/*.tsx`. Use relative imports — the `@/*` tsconfig alias is unused.
- Data flow: screens → Zustand stores (`src/stores/*`) → services (`src/services/*`, raw SQL) → `dbQuery`/`withTransaction` in `src/database/database.ts`. No ORM.
- Schema is created in `initDatabase()` (`src/database/database.ts`) via `CREATE TABLE IF NOT EXISTS` plus idempotent `ALTER TABLE` migrations. Schema changes belong there as new migrations; existing installs already have old tables.
- **Web gotcha:** `src/database/database.web.ts` is a hand-rolled in-memory SQL emulation (regex parser). It only handles simple single-table `SELECT`/`INSERT`/`UPDATE`/`DELETE` with `?` params. JOINs, `GROUP BY`, and aggregates (heavily used in `getDashboardStats`/`getIncomeChartData`) silently return no or partial data on web — don't treat web as proof a query works on native.
- `src/database/schema.ts` is currently unused; the live schema is split between `database.ts` and `database.web.ts`.

## Conventions

- All user-facing strings go through `t()` (global, usable in services) or `useTranslation()` (components). Add new keys to BOTH `src/i18n/en.ts` and `src/i18n/es.ts`.
- Dates are `dayjs` ISO strings (`YYYY-MM-DD`); currency via `Intl.NumberFormat` USD in `src/utils/formatters.ts`.
- `.vscode/settings.json` auto-organizes imports and sorts members on save.
- DB must be initialized (`initDatabase()`) before any service call — the root layout handles this, then starts a 30s keep-alive ping to stop Android dropping the idle SQLite connection.
