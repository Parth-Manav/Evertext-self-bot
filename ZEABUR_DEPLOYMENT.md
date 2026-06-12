# Zeabur Deployment

Quick notes on deploying this to Zeabur's free tier.

## Prerequisites

Set these environment variables in your Zeabur project:

- `DISCORD_TOKEN` — your bot token from the Discord Developer Portal
- `ENCRYPTION_KEY` — 32-byte hex key for encrypting restore codes
- `GAME_URL` — the target browser URL
- `WS_BASE_URL` — the WebSocket endpoint
- `DATABASE_URL` — optional, PostgreSQL connection string if you want persistent job history

## Steps

1. Push your code to GitHub
2. Connect the repository to Zeabur
3. Add the environment variables above
4. Deploy

The bot will run migrations on first startup and connect to Discord automatically.

## Free Tier Notes

The bot is reasonably light at idle — just Node.js and the Discord connection.
Memory goes up when Puppeteer is running a session (~150-250MB).
If you hit memory limits, the main things that help are:

- Keep `--disable-dev-shm-usage` and `--disable-gpu` in the Puppeteer launch flags
- Make sure resource blocking is on (images, fonts, stylesheets are already blocked in `src/browser-controller.js`)
- The sequential queue means only one browser session runs at a time, which helps

## Database Persistence

`db.json` is the default store and persists between restarts on Zeabur.
If you set `DATABASE_URL`, the bot will dual-write to PostgreSQL as well.
The import script (`npm run db:import`) can backfill existing accounts into PostgreSQL if needed.

## Known Issues

- The Rust binary (`evertext_brain`) needs to be compiled for Linux if you're deploying from Windows. The release build in the repo should work but rebuild if you see brain-related errors on startup.
- Global slash command registration can take up to an hour to propagate. Set `GUILD_ID` for instant updates during testing.