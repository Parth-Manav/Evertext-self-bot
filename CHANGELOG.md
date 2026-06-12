# Changelog

## v1.3.0 - 2026-06-12

### Added
- PostgreSQL dual-write persistence layer (Phase 1)
- Four-table schema: `queue_runs`, `automation_accounts`, `task_jobs`, `task_attempts`
- Crash recovery on startup — stale running jobs marked as interrupted
- Live web dashboard at `/dashboard` with auto-refresh
- Metrics endpoints: `GET /metrics`, `GET /jobs`, `GET /accounts`
- `npm run db:import` script to migrate existing `db.json` accounts into PostgreSQL
- Bot reads from PostgreSQL when `DATABASE_URL` is configured
- Graceful fallback to `db.json` when PostgreSQL is unavailable

### Changed
- `db.js` delegates `getAccounts()` reads to PostgreSQL when enabled
- `manager.js` records job and attempt history to PostgreSQL after each session
- Startup sequence now runs migrations before scheduler and bot init

---

## v1.2.0 - 2026-05-23

### Added
- Configurable target URLs via `GAME_URL`, `WS_BASE_URL`, and `TARGET_NAME` environment variables
- Node.js unit tests using the built-in `node:test` runner
- Rust unit tests for state machine transitions and parsing helpers
- GitHub Actions CI for Node and Rust

### Changed
- Replaced hardcoded WebSocket origin and host headers with values derived from `GAME_URL`
- Moved magic numbers and constants into `src/constants.js`

### Fixed
- WebSocket reconnect path now correctly resets terminal buffer before retry

---

## v1.1.0 - 2026-03-24

### Added
- `server_toggle` flag per account — skips server selection screen when disabled
- `force_run_error_all_again` Discord command to re-run only failed accounts
- Exponential backoff retry on Discord log delivery (3 attempts)
- `GUILD_ID` environment variable for faster slash command registration during development

### Changed
- Browser controller now blocks images, stylesheets, and fonts to reduce memory usage
- Incognito context created per session instead of reusing a shared context

### Fixed
- Account status not updating correctly after a deferred session
- Brain process not terminated cleanly on session timeout

---

## v1.0.0 - 2026-01-05

### Initial release

- Discord slash commands for account management and queue control
- Puppeteer browser automation with shared Chromium instance
- Rust state machine over JSON IPC for terminal decision logic
- AES-256 encrypted storage for restore codes and session cookies
- Sequential queue with AsyncLock to prevent overlapping sessions
- `db.json` persistence via lowdb
- Health check server on configurable port