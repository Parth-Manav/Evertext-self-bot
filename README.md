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

## 📥 Prerequisites & Installation

Before you can run the bot, you need to install a few tools. Follow these steps exactly.

### Step 1: Install Node.js
Node.js is the engine that runs the JavaScript part of the bot.

1.  **Download:** Go to [nodejs.org](https://nodejs.org/).
2.  **Select:** Click the button for the **"LTS" (Long Term Support)** version.
3.  **Install:** Run the installer.
    *   ✅ **Important:** During installation, if asked, check the box that says **"Automatically install the necessary tools"** (this helps with other dependencies).
4.  **Verify:** Open a command prompt (`cmd`) and type `node -v`. You should see a version number (e.g., `v18.x.x`).

### Step 2: Install Rust
Rust is required to build the "Brain" of the bot (the decision engine).

1.  **Download:** Go to [rust-lang.org/tools/install](https://www.rust-lang.org/tools/install).
2.  **Select:** Download **RUSTUP-INIT.EXE** (64-bit).
3.  **Install:** Run the executable.
    *   It may ask to install "Visual Studio Build Tools". Say **YES/Y**.
    *   When prompted with options 1, 2, 3... type `1` and press Enter to proceed with default installation.
4.  **Verify:** Open a NEW command prompt and type `cargo --version`. You should see something like `cargo 1.8x.x`.

### Step 3: Install Git (Optional but Recommended)
Git allows you to easily download and update the code.

1.  **Download:** Go to [git-scm.com](https://git-scm.com/).
2.  **Install:** Run the installer. You can just keep clicking "Next" through all the options (defaults are fine).

### Step 4: Install Visual Studio Code (Optional)
The best editor for viewing and editing the bot's code.

1.  **Download:** Go to [code.visualstudio.com](https://code.visualstudio.com/).
2.  **Install:** Run the installer.

---

## 🚀 How to Run the Bot

You have two ways to run the bot.

### Option A: The "Easiest" Way (Executable)

If you have downloaded the pre-built `bot.exe` or built it yourself:

1.  **Double-click `bot.exe`**.
2.  The bot will verify your setup.
3.  **First time?** It will ask you for:
    - `DISCORD_TOKEN`
    - `ENCRYPTION_KEY` (Optional)
    - `LOG_CHANNEL_ID` (For bot/status notifications)
    
    These will be saved to a `.env` file automatically
    so you don't have to type them again.
5.  The bot will launch!

### Option B: The "Developer" Way (Source Code)

If you downloaded the source code and want to run it directly:

1.  **Open Terminal:**
    Open the folder in VS Code, then open a Terminal (`Ctrl + ~`).

2.  **Install Dependencies:**
    Run this command to download all libraries:
    ```bash
    npm install
    ```

3.  **Build the Project:**
    This compiles the Rust brain and sets everything up.
    ```bash
    npm run build
    ```

4.  **Start the Bot:**
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

## 🐛 Troubleshooting & FAQ

### 1. "No session cookie configured"
- **Cause:** You haven't added the Evertale session cookie yet.
- **Solution:** Use the `/set_cookies` command in Discord with your valid cookie status string.

### 2. "LOGIN_REQUIRED - Cookie expired"
- **Cause:** The game session has expired (usually happens every few days).
- **Solution:** Get a fresh cookie from your browser inspection and update it using `/set_cookies`.

### 3. Bot stuck at server selection?
- **Solution:** This usually means the bot can't see the text properly. The Hybrid architecture fixes this, but if it persists, check your `targetServer` setting for that account.

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
