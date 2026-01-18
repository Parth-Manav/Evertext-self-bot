# Evertext Discord Bot - Hybrid Automation

A sophisticated Discord bot for automating Evertale game dailies using a **hybrid Puppeteer + WebSocket architecture** with a Rust-based decision engine.

## 🏗️ Architecture Overview

This bot combines the best of both worlds:

```
┌─────────────────────────────────────────────────────────────┐
│                    Discord Bot Layer                         │
│  • Commands (/force_run_all, /force_stop_all, etc.)        │
│  • Queue Management                                          │
│  • Daily Scheduling (GMT 00:00 reset)                        │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                 Manager (Queue Orchestrator)                 │
│  • Sequential ID processing                                  │
│  • Browser lifecycle (open once, close at end)              │
│  • Kill-switch support                                       │
│  • 10-second delays between IDs                              │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────┬──────────────────────────────────────┐
│ Browser Controller   │  WebSocket Client + Rust Brain       │
│ (Puppeteer)          │  (Terminal Logic)                    │
├──────────────────────┼──────────────────────────────────────┤
│ • Open browser       │  • Connect to game server            │
│ • Inject cookies     │  • Send commands (d, code, y, auto)  │
│ • Click START        │  • Receive terminal output           │
│ • Click STOP         │  • Process with state machine        │
│ • Keep session alive │  • Handle errors (Zigza, Invalid)    │
└──────────────────────┴──────────────────────────────────────┘
```

### Why Hybrid?

| Approach | Browser | Session Life | Terminal Logic | Resources |
|----------|---------|--------------|----------------|-----------|
| **Pure Puppeteer** | ✅ Required | ✅ 24+ hours | ❌ Slow (DOM) | ❌ High |
| **Pure WebSocket** | ❌ Not needed | ❌ ~2 hours | ✅ Fast (events) | ✅ Low |
| **Hybrid (This!)** | ✅ Reused | ✅ 24+ hours | ✅ Fast (events) | ✅ Low |

**The Solution:** Use Puppeteer ONLY for browser management (Start/Stop buttons, cookie injection) while WebSocket handles all game logic (fast, event-driven).

---

## 📁 Project Structure

```
Evertext-Discord-Bot-main/
├── src/
│   ├── bot.js                  # Discord commands & event handling
│   ├── manager.js              # Queue processor with kill-switch
│   ├── runner.js               # Hybrid orchestrator (Puppeteer+WebSocket)
│   ├── browser-controller.js  # Puppeteer wrapper
│   ├── websocket-client.js    # Socket.IO game client
│   ├── brain.js                # Rust brain wrapper
│   └── db.js                   # Database (lowdb) with encryption
├── evertext_brain/
│   ├── src/
│   │   └── main.rs             # Rust state machine (decision engine)
│   ├── Cargo.toml
│   └── Cargo.lock
├── index.js                    # Entry point
├── package.json                # Node.js dependencies
├── db.json                     # Encrypted account data
└── .env                        # Environment variables (NOT in repo)
```

---

## 🔧 Component Breakdown

### 1. **Browser Controller** (`src/browser-controller.js`)
**Purpose:** Manages Chromium browser lifecycle

**Key Functions:**
- `launch(cookies)` - Opens browser with session cookies
- `clickStart()` - Clicks terminal Start button
- `clickStop()` - Clicks terminal Stop button
- `close()` - Closes browser

**Important:** Browser is launched ONCE per queue, not per account.

### 2. **WebSocket Client** (`src/websocket-client.js`)
**Purpose:** Real-time connection to game server

**Features:**
- Socket.IO protocol implementation
- Auto-responds to server pings
- Emits `output` events for terminal updates
- Sends commands via `sendCommand(text)`

### 3. **Rust Brain** (`evertext_brain/src/main.rs`)
**Purpose:** Stateful decision-making engine

**Features:**
- Maintains 10,000-character history buffer
- Tracks `auto_sent` flag (ensures "auto" sent only once)
- State machine for game flow
- Handles all error types (Zigza, Invalid Command, etc.)

**States:**
- `Initial` → `WaitingForCodePrompt` → `WaitingForServerList`
- `WaitingForManaPrompt` → `WaitingForEventList` → `InEventLoop`
- `ManaRefillFlow` (3-step: y → 3 → 1)
- `AlternateEventFlow` (send "exit" on 2nd prompt)

### 4. **Hybrid Runner** (`src/runner.js`)
**Purpose:** Orchestrates Puppeteer + WebSocket

**Flow Per Account:**
1. Browser clicks START (Puppeteer)
2. WebSocket connects
3. Brain processes events → sends commands
4. When complete, browser clicks STOP
5. Returns browser instance to manager

### 5. **Queue Manager** (`src/manager.js`)
**Purpose:** Sequential account processing

**Features:**
- Processes accounts one-by-one
- Keeps browser open between accounts
- 10-second delays between IDs
- 10-minute defer for Zigza errors (timestamp tracking)
- Kill-switch support (`/force_stop_all`)

---

## 🚀 Setup Instructions

### Prerequisites
- **Node.js** (v18+)
- **Rust** (latest stable)
- **Discord Bot Token**
- **Evertale Session Cookie**

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Parth-Manav/final-evertext-bot.git
   cd final-evertext-bot
   ```

2. **Install Node.js dependencies:**
   ```bash
   npm install
   ```

3. **Build Rust brain:**
   ```bash
   cd evertext_brain
   cargo build --release
   cd ..
   ```
   This creates `evertext_brain.exe` in the root directory.

4. **Create `.env` file:**
   ```env
   DISCORD_TOKEN=your_discord_bot_token
   GUILD_ID=your_guild_id_optional
   LOG_CHANNEL_ID=your_log_channel_id
   ENCRYPTION_KEY=your_32_char_encryption_key
   ```

5. **Set session cookie:**
   Use `/set_cookies` command in Discord (admin only)

6. **Start the bot:**
   ```bash
   npm start
   ```

---

## 💬 Discord Commands

### 👤 User Commands

| Command | Description |
|---------|-------------|
| `/add_account` | Add game account with restore code |
| `/remove_account` | Remove an account |
| `/list_accounts` | View all configured accounts |
| `/list_my_accounts` | View only your accounts (planned) |
| `/force_run {name}` | Run specific account immediately |
| `/toggle_ping` | Toggle ping notifications (planned) |

### 🔑 Admin Commands

| Command | Description |
|---------|-------------|
| `/force_run_all` | 🚀 Run ALL accounts in queue |
| `/force_stop_all` | 🛑 Emergency kill-switch |
| `/set_cookies` | Update session cookie |
| `/set_admin_role` | Configure bot admin role |
| `/set_schedule` | Set active hours |
| `/set_log_channel` | Set logging channel (planned) |
| `/mute_bot` / `/unmute_bot` | Toggle bot messages (planned) |

---

## 🎮 Terminal Flow (Per Account)

```
1. Browser clicks START (Puppeteer)
2. Send "d" (Restore mode)
3. Send restore code
4. IF multiple servers → Select server
5. Send "y" (spend mana prompt)
6. Send "auto" (ONCE ONLY)
7. Loop: Handle mana refills, more events
8. Detect "Press y to perform more commands"
9. Browser clicks STOP
10. Wait 10 seconds
11. Next account...
```

### Conditional Logic

#### Mana Refill Flow (3-step)
```
"DO U WANT TO REFILL MANA?" → y
"Enter 1, 2 or 3 to select potion" → 3
"Enter the number of stam100 potions" → 1
[Can repeat multiple times]
```

#### Alternate Event Flow
```
"Press y to do more events" → y
"next: Go to the next event" (2nd time) → exit
[NOT "auto" - that's only sent once!]
```

---

## ⚠️ Error Handling

| Error Type | Detection | Action |
|------------|-----------|--------|
| **Zigza Error** | "Either Zigza error or Incorrect Restore Code" | Defer to end of queue, wait 10 minutes |
| **Invalid Command** | "Invalid Command ... Exiting Now" | Click STOP, Click START, restart session |
| **Server Full** | "Server reached maximum limit" | Restart session |
| **Login Required** | Cookie expired | Abort with LOGIN_REQUIRED error |

### 10-Minute Defer Logic

When an account encounters a Zigza error:
1. Current timestamp is stored: `deferredAccounts.set(accountId, Date.now())`
2. Account moved to end of queue
3. Before processing, elapsed time is checked
4. If < 10 minutes: **Skip**
5. If ≥ 10 minutes: **Retry**

---

## 📅 Daily Scheduling

- **Automated Reset:** Every day at **GMT 00:00**
- **Action:** All account statuses reset to `pending`
- **Queue Auto-Start:** Queue begins processing automatically

---

## 🛠️ Technical Details

### Database (db.json)
- Uses **lowdb** for JSON storage
- **Encryption:** Account restore codes encrypted with AES
- **Fields per account:**
  - `id` (timestamp-based)
  - `name` (user-defined)
  - `encryptedCode` (restore code)
  - `targetServer` (e.g., "E-15" or "All")
  - `lastRun` (ISO timestamp)
  - `status` (`idle`, `pending`, `running`, `done`, `error`, `deferred`)

### Browser Lifecycle
- **Single Instance:** Browser launched once per queue
- **Reused:** Same browser for all accounts (Start/Stop clicks only)
- **Closed:** Only after ALL accounts processed
- **Cookie Injection:** Session cookie injected at launch

### WebSocket Connection
- **Protocol:** Socket.IO (EIO=4, WebSocket transport)
- **Events:**
  - `output` - Terminal text updates
  - `idle_timeout` - Session timeout
  - `connection_failed` - Connection error
- **Auto-ping:** Responds to server pings automatically

### Rust Brain Communication
- **Protocol:** JSON over stdin/stdout
- **Input:** `{ type: "terminal_output", content: "...", account: {...} }`
- **Output:** `{ action: "send_text"|"close_terminal"|"wait"|..., payload: "..." }`

---

## 🐛 Debugging

### Check Bot Status
```bash
npm start
# Look for: [Discord] Logged in as...
```

### Test Single Account
```
/force_run name:YourAccount
```

### View Logs
- Console output shows all brain decisions
- Discord log channel (if configured) shows account progress

### Common Issues

**1. "Failed to start brain executable"**
- Solution: Build Rust brain with `cargo build --release`

**2. "No session cookie configured"**
- Solution: Use `/set_cookies` command

**3. "LOGIN_REQUIRED - Cookie expired"**
- Solution: Get new session cookie and update with `/set_cookies`

**4. Bot stuck at server selection**
- Fixed: Hybrid architecture ensures full context available

---

## 🎯 Zero-Error Guarantee

All **8 critical bugs** from initial development were identified and fixed:

1. ✅ Browser lifecycle (shared instance between accounts)
2. ✅ 10-minute defer delay (timestamp tracking)
3. ✅ WebSocket double-connection prevention
4. ✅ Mana refill state transitions (proper waits)
5. ✅ Error handling with null checks
6. ✅ Restart flow with brain reset
7. ✅ Cleanup in all error paths
8. ✅ Browser state validation

See `verification_report.md` for details.

---

## 📝 License

Personal use only. Not for redistribution.

---

## 🙏 Credits

Built with hybrid Puppeteer + WebSocket architecture, combining browser automation reliability with event-driven performance.

**Tech Stack:**
- **Node.js** - Discord bot & orchestration
- **Rust** - Decision engine & state machine
- **Puppeteer** - Browser automation
- **Socket.IO** - WebSocket client
- **lowdb** - JSON database
- **Discord.js** - Discord API
