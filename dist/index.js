import { createRequire as __WEBPACK_EXTERNAL_createRequire } from "module";
/******/ (function() { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ 324:
/***/ (function(module, __webpack_exports__, __nccwpck_require__) {

"use strict";
__nccwpck_require__.a(module, async (__webpack_handle_async_dependencies__, __webpack_async_result__) => { try {
__nccwpck_require__.r(__webpack_exports__);
/* harmony import */ var _src_manager_js__WEBPACK_IMPORTED_MODULE_0__ = __nccwpck_require__(110);
/* harmony import */ var _src_bot_js__WEBPACK_IMPORTED_MODULE_1__ = __nccwpck_require__(988);
/* harmony import */ var child_process__WEBPACK_IMPORTED_MODULE_2__ = __nccwpck_require__(317);
/* harmony import */ var child_process__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__nccwpck_require__.n(child_process__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var util__WEBPACK_IMPORTED_MODULE_3__ = __nccwpck_require__(23);
/* harmony import */ var util__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__nccwpck_require__.n(util__WEBPACK_IMPORTED_MODULE_3__);
/* harmony import */ var _src_health_server_js__WEBPACK_IMPORTED_MODULE_4__ = __nccwpck_require__(681);
/* harmony import */ var _src_setup_js__WEBPACK_IMPORTED_MODULE_5__ = __nccwpck_require__(32);
var __webpack_async_dependencies__ = __webpack_handle_async_dependencies__([_src_manager_js__WEBPACK_IMPORTED_MODULE_0__, _src_bot_js__WEBPACK_IMPORTED_MODULE_1__]);
([_src_manager_js__WEBPACK_IMPORTED_MODULE_0__, _src_bot_js__WEBPACK_IMPORTED_MODULE_1__] = __webpack_async_dependencies__.then ? (await __webpack_async_dependencies__)() : __webpack_async_dependencies__);

 // client needed for shutdown





const execAsync = (0,util__WEBPACK_IMPORTED_MODULE_3__.promisify)(child_process__WEBPACK_IMPORTED_MODULE_2__.exec);

console.log('[Main] Starting Evertext Auto Bot...');
// console.log('🔴🔴🔴 LOADING NEW CODE VERSION 9000 🔴🔴🔴');

// --- 1. Cleanup Orphaned Processes (Startup) ---
async function killOrphanedChrome() {
    try {
        console.log('[Startup] Checking for orphaned Chrome processes...');
        const isWindows = process.platform === 'win32';
        const command = isWindows ? 'tasklist | findstr chrome.exe' : 'ps aux | grep chrome | grep -v grep';

        const { stdout } = await execAsync(command).catch(() => ({ stdout: '' }));

        if (stdout.includes('chrome')) {
            console.log('[Startup] ⚠️  Found orphaned Chrome processes. Killing...');
            const killCmd = isWindows ? 'taskkill /F /IM chrome.exe /T' : 'pkill -9 chrome';
            await execAsync(killCmd).catch(() => { }); // Ignore errors if already dead
            console.log('[Startup] ✅ Killed orphaned Chrome processes');
            await new Promise(r => setTimeout(r, 2000));
        } else {
            console.log('[Startup] ✅ No orphaned Chrome processes found');
        }
    } catch (err) {
        console.log('[Startup] Chrome cleanup skipped (no processes found)');
    }
}

// --- 2. Graceful Shutdown Handler ---
let isShuttingDown = false;
async function gracefulShutdown(signal) {
    if (isShuttingDown) return;
    isShuttingDown = true;

    console.log(`\n🛑 [Shutdown] Received ${signal}, cleaning up...`);

    // Stop accepting new work
    (0,_src_manager_js__WEBPACK_IMPORTED_MODULE_0__/* .forceStop */ .uq)();

    // Disconnect Discord bot
    if (_src_bot_js__WEBPACK_IMPORTED_MODULE_1__/* .client */ .Sn) {
        console.log('[Shutdown] Disconnecting Discord bot...');
        await _src_bot_js__WEBPACK_IMPORTED_MODULE_1__/* .client */ .Sn.destroy();
    }

    // Wait for ongoing cleanups
    await new Promise(r => setTimeout(r, 2000));

    console.log('✅ [Shutdown] Cleanup complete. Exiting...');
    process.exit(0);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// --- Global Error Handling ---
process.on('uncaughtException', (err) => {
    console.error('🔥 [CRITICAL] Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('🔥 [CRITICAL] Unhandled Rejection at:', promise, 'reason:', reason);
});

// --- Main Bootstrap ---
(async () => {
    await (0,_src_setup_js__WEBPACK_IMPORTED_MODULE_5__/* .runSetup */ .x)();
    await killOrphanedChrome();

    // Start Health Check (for Zeabur)
    const port = process.env.PORT || 3000;
    (0,_src_health_server_js__WEBPACK_IMPORTED_MODULE_4__/* .startHealthServer */ .wU)(port);

    // Start App
    (0,_src_manager_js__WEBPACK_IMPORTED_MODULE_0__/* .startScheduler */ .wP)();
    (0,_src_bot_js__WEBPACK_IMPORTED_MODULE_1__/* .startBot */ .ak)();
})();

__webpack_async_result__();
} catch(e) { __webpack_async_result__(e); } });

/***/ }),

/***/ 277:
/***/ (function(__unused_webpack_module, __webpack_exports__, __nccwpck_require__) {

"use strict";
/* harmony export */ __nccwpck_require__.d(__webpack_exports__, {
/* harmony export */   m: () => (/* binding */ AsyncLock)
/* harmony export */ });
// Simple async lock to prevent race conditions
class AsyncLock {
    constructor() {
        this.locked = false;
        this.queue = [];
    }

    async acquire() {
        return new Promise((resolve) => {
            if (!this.locked) {
                this.locked = true;
                resolve();
            } else {
                this.queue.push(resolve);
            }
        });
    }

    release() {
        if (this.queue.length > 0) {
            const next = this.queue.shift();
            next();
        } else {
            this.locked = false;
        }
    }
}


/***/ }),

/***/ 988:
/***/ (function(module, __webpack_exports__, __nccwpck_require__) {

"use strict";
__nccwpck_require__.a(module, async (__webpack_handle_async_dependencies__, __webpack_async_result__) => { try {
/* harmony export */ __nccwpck_require__.d(__webpack_exports__, {
/* harmony export */   Sn: () => (/* binding */ client),
/* harmony export */   ak: () => (/* binding */ startBot),
/* harmony export */   ll: () => (/* binding */ sendLog)
/* harmony export */ });
/* harmony import */ var discord_js__WEBPACK_IMPORTED_MODULE_0__ = __nccwpck_require__(296);
/* harmony import */ var discord_js__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__nccwpck_require__.n(discord_js__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var dotenv__WEBPACK_IMPORTED_MODULE_1__ = __nccwpck_require__(285);
/* harmony import */ var dotenv__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__nccwpck_require__.n(dotenv__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _db_js__WEBPACK_IMPORTED_MODULE_2__ = __nccwpck_require__(467);
/* harmony import */ var _manager_js__WEBPACK_IMPORTED_MODULE_3__ = __nccwpck_require__(110);
var __webpack_async_dependencies__ = __webpack_handle_async_dependencies__([_db_js__WEBPACK_IMPORTED_MODULE_2__, _manager_js__WEBPACK_IMPORTED_MODULE_3__]);
([_db_js__WEBPACK_IMPORTED_MODULE_2__, _manager_js__WEBPACK_IMPORTED_MODULE_3__] = __webpack_async_dependencies__.then ? (await __webpack_async_dependencies__)() : __webpack_async_dependencies__);

console.log('🔵🔵🔵 bot.js module loaded! 🔵🔵🔵');




dotenv__WEBPACK_IMPORTED_MODULE_1___default().config();

const client = new discord_js__WEBPACK_IMPORTED_MODULE_0__.Client({ intents: [discord_js__WEBPACK_IMPORTED_MODULE_0__.GatewayIntentBits.Guilds] });

const commands = [
    new discord_js__WEBPACK_IMPORTED_MODULE_0__.SlashCommandBuilder()
        .setName('add_account')
        .setDescription('Add a new game account')
        .addStringOption(option => option.setName('name').setDescription('Account Name').setRequired(true))
        .addStringOption(option => option.setName('code').setDescription('Restore Code').setRequired(true))
        .addBooleanOption(option => option.setName('server_toggle').setDescription('Enable Server Selection? (True=Select, False=Skip)').setRequired(true))
        .addStringOption(option => option.setName('server').setDescription('Target Server (e.g., E-15, All) - Required if Toggle is True').setRequired(false)),
    new discord_js__WEBPACK_IMPORTED_MODULE_0__.SlashCommandBuilder()
        .setName('list_accounts')
        .setDescription('List all configured accounts'),
    new discord_js__WEBPACK_IMPORTED_MODULE_0__.SlashCommandBuilder()
        .setName('list_my_accounts')
        .setDescription('List only your accounts'),
    new discord_js__WEBPACK_IMPORTED_MODULE_0__.SlashCommandBuilder()
        .setName('toggle_ping')
        .setDescription('Toggle ping notifications for your accounts'),
    new discord_js__WEBPACK_IMPORTED_MODULE_0__.SlashCommandBuilder()
        .setName('force_run')
        .setDescription('Force run your account(s)')
        .addStringOption(option => option.setName('name').setDescription('Account Name (leave empty for all yours)').setRequired(false)),
    new discord_js__WEBPACK_IMPORTED_MODULE_0__.SlashCommandBuilder()
        .setName('force_run_all')
        .setDescription('[ADMIN] Run ALL accounts in the database'),
    new discord_js__WEBPACK_IMPORTED_MODULE_0__.SlashCommandBuilder()
        .setName('force_stop_all')
        .setDescription('[ADMIN] Emergency kill-switch to stop all processes'),
    new discord_js__WEBPACK_IMPORTED_MODULE_0__.SlashCommandBuilder()
        .setName('remove_account')
        .setDescription('Remove a game account')
        .addStringOption(option => option.setName('name').setDescription('Account Name to remove').setRequired(true)),
    new discord_js__WEBPACK_IMPORTED_MODULE_0__.SlashCommandBuilder()
        .setName('set_schedule')
        .setDescription('[ADMIN] Set the active hours for the bot')
        .addIntegerOption(option => option.setName('start_hour').setDescription('Start Hour (0-23)').setRequired(true))
        .addIntegerOption(option => option.setName('end_hour').setDescription('End Hour (0-23)').setRequired(true)),
    new discord_js__WEBPACK_IMPORTED_MODULE_0__.SlashCommandBuilder()
        .setName('set_cookies')
        .setDescription('[ADMIN] Updates the global session cookie')
        .addStringOption(option => option.setName('cookies').setDescription('Paste cookie string (key=value; ...) or JSON').setRequired(true)),
    new discord_js__WEBPACK_IMPORTED_MODULE_0__.SlashCommandBuilder()
        .setName('force_run_again_all')
        .setDescription('Reset all accounts to pending and run them immediately (Admin Only)'),
    new discord_js__WEBPACK_IMPORTED_MODULE_0__.SlashCommandBuilder()
        .setName('force_run_error_all_again')
        .setDescription('Reset and run ONLY accounts with error status (Admin Only)'),
    new discord_js__WEBPACK_IMPORTED_MODULE_0__.SlashCommandBuilder()
        .setName('set_admin_role')
        .setDescription('Set the role that can manage the bot')
        .addRoleOption(option => option.setName('role').setDescription('Select Admin Role').setRequired(true)),
    new discord_js__WEBPACK_IMPORTED_MODULE_0__.SlashCommandBuilder()
        .setName('set_log_channel')
        .setDescription('[ADMIN] Set the channel for bot logs')
        .addChannelOption(option => option.setName('channel').setDescription('Log Channel').setRequired(true)),
    new discord_js__WEBPACK_IMPORTED_MODULE_0__.SlashCommandBuilder()
        .setName('mute_bot')
        .setDescription('[ADMIN] Mute automatic bot messages'),
    new discord_js__WEBPACK_IMPORTED_MODULE_0__.SlashCommandBuilder()
        .setName('unmute_bot')
        .setDescription('[ADMIN] Unmute automatic bot messages'),
];

client.once(discord_js__WEBPACK_IMPORTED_MODULE_0__.Events.ClientReady, async () => {
    // ... (unchanged)
    console.log(`[Discord] Logged in as ${client.user.tag}`);

    const rest = new discord_js__WEBPACK_IMPORTED_MODULE_0__.REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    try {
        console.log('[Discord] Refreshing application (/) commands.');
        // If GUILD_ID is set and not the placeholder, register to guild
        if (process.env.GUILD_ID && process.env.GUILD_ID !== 'your_guild_id_here') {
            await rest.put(discord_js__WEBPACK_IMPORTED_MODULE_0__.Routes.applicationGuildCommands(client.user.id, process.env.GUILD_ID), { body: commands });
        } else {
            console.log('[Discord] Registering global commands (this may take a while to update)...');
            await rest.put(discord_js__WEBPACK_IMPORTED_MODULE_0__.Routes.applicationCommands(client.user.id), { body: commands });
        }
        console.log('[Discord] Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName } = interaction;

    try {
        // --- Permission Check ---
        const sensitiveCommands = ['add_account', 'remove_account', 'set_schedule', 'set_cookies', 'force_run_again_all', 'force_run_error_all_again', 'force_run_all', 'force_stop_all', 'set_admin_role', 'set_log_channel', 'mute_bot', 'unmute_bot'];
        if (sensitiveCommands.includes(commandName)) {
            const adminRoleId = await (0,_db_js__WEBPACK_IMPORTED_MODULE_2__/* .getAdminRole */ .Gx)();
            const hasAdminRole = adminRoleId && interaction.member.roles.cache.has(adminRoleId);
            const isDiscordAdmin = interaction.memberPermissions.has('Administrator');

            if (!hasAdminRole && !isDiscordAdmin) {
                await interaction.reply({ content: '❌ You do not have permission to use this command.', ephemeral: true });
                return;
            }
        }


        if (commandName === 'add_account') {
            const name = interaction.options.getString('name');
            const code = interaction.options.getString('code');
            const serverToggle = interaction.options.getBoolean('server_toggle');
            let server = interaction.options.getString('server');

            // Logic Validation
            if (serverToggle && !server) {
                await interaction.reply({ content: '❌ **Error**: You set `Server Selection: True`, so you MUST provide a `Target Server`!', ephemeral: true });
                return;
            }

            // Default server string if skipping
            if (!server) server = 'Auto-Skip';

            // Encrypt the code before storing
            const encryptedCode = (0,_db_js__WEBPACK_IMPORTED_MODULE_2__/* .encrypt */ .w)(code);
            await (0,_db_js__WEBPACK_IMPORTED_MODULE_2__/* .addAccount */ .F7)(name, encryptedCode, server, serverToggle);
            await interaction.reply({ content: `✅ Account **${name}** added!\nServer Selection: **${serverToggle ? 'Enabled' : 'Disabled'}**\nTarget: ${server}`, ephemeral: true });
        }
        else if (commandName === 'list_accounts') {
            const accounts = await (0,_db_js__WEBPACK_IMPORTED_MODULE_2__/* .getAccounts */ .P4)();
            if (accounts.length === 0) {
                await interaction.reply('No accounts configured.');
                return;
            }

            const embed = new discord_js__WEBPACK_IMPORTED_MODULE_0__.EmbedBuilder()
                .setTitle('Configured Accounts')
                .setDescription(accounts.map(a =>
                    `**${a.name}** (Server: ${a.targetServer})\nStatus: ${a.status}\nLast Run: ${a.lastRun ? new Date(a.lastRun).toLocaleString() : 'Never'}`
                ).join('\n\n'));

            await interaction.reply({ embeds: [embed] });
        }
        else if (commandName === 'force_run') {
            const name = interaction.options.getString('name');
            const accounts = await (0,_db_js__WEBPACK_IMPORTED_MODULE_2__/* .getAccounts */ .P4)();

            if (!name) {
                // Run all user's accounts (future enhancement - for now just error)
                await interaction.reply({ content: 'Please specify an account name.', ephemeral: true });
                return;
            }

            if (name.toLowerCase() === 'all') {
                await interaction.reply(`Starting batch session for **ALL** accounts... Check console/logs for progress.`);
                (0,_manager_js__WEBPACK_IMPORTED_MODULE_3__/* .runBatch */ .a7)(accounts).then(() => {
                    interaction.followUp(`Batch session for **ALL** accounts finished.`).catch(console.error);
                }).catch(err => {
                    console.error('Batch run error:', err);
                    interaction.followUp(`❌ Batch run encountered an error: ${err.message}`).catch(console.error);
                });
                return;
            }

            const account = accounts.find(a => a.name === name);

            if (!account) {
                await interaction.reply({ content: `Account **${name}** not found.`, ephemeral: true });
                return;
            }

            await interaction.reply(`Starting session for **${name}**... Check console/logs for progress.`);

            (0,_manager_js__WEBPACK_IMPORTED_MODULE_3__/* .executeSession */ .MH)(account.id).then(result => {
                if (result.success) {
                    interaction.followUp(`Session for **${name}** finished successfully.`).catch(console.error);
                } else {
                    interaction.followUp(`Session for **${name}** failed: ${result.message}`).catch(console.error);
                }
            }).catch(err => {
                console.error(`Session execution error for ${name}:`, err);
                interaction.followUp(`❌ Critical error running session for **${name}**: ${err.message}`).catch(console.error);
            });
        }
        else if (commandName === 'force_run_again_all') {
            // Admin check (already done above, but kept for clarity if structure differs)
            // actually the sensitive command check covers it.

            await interaction.reply('🔄 **Resetting all accounts and restarting queue...**');
            await (0,_db_js__WEBPACK_IMPORTED_MODULE_2__/* .resetAllStatuses */ .fr)();

            // Start batch
            setImmediate(() => {
                (0,_manager_js__WEBPACK_IMPORTED_MODULE_3__/* .runBatch */ .a7)().catch(err => console.error('[Bot] Batch run failed:', err));
            });
        }
        else if (commandName === 'force_run_error_all_again') {
            const count = await (0,_db_js__WEBPACK_IMPORTED_MODULE_2__/* .resetErrorStatuses */ .Qp)();
            if (count === 0) {
                await interaction.reply({ content: '✅ No accounts found with "error" status.', ephemeral: true });
                return;
            }

            await interaction.reply(`🔄 **Resetting ${count} failed accounts and restarting queue...**`);

            // Start batch
            setImmediate(() => {
                (0,_manager_js__WEBPACK_IMPORTED_MODULE_3__/* .runBatch */ .a7)().catch(err => console.error('[Bot] Batch run failed:', err));
            });
        }
        else if (commandName === 'force_run_all') {
            // Admin check
            const adminRoleId = await (0,_db_js__WEBPACK_IMPORTED_MODULE_2__/* .getAdminRole */ .Gx)();
            const hasAdminRole = adminRoleId && interaction.member.roles.cache.has(adminRoleId);
            const isDiscordAdmin = interaction.memberPermissions.has('Administrator');

            if (!hasAdminRole && !isDiscordAdmin) {
                await interaction.reply({ content: '❌ Admin permission required.', ephemeral: true });
                return;
            }

            const accounts = await (0,_db_js__WEBPACK_IMPORTED_MODULE_2__/* .getAccounts */ .P4)();
            await interaction.reply(`🚀 Starting ALL accounts (${accounts.length}) in queue...`);

            (0,_manager_js__WEBPACK_IMPORTED_MODULE_3__/* .runBatch */ .a7)(accounts).then(() => {
                interaction.followUp(`✅ Queue complete - all accounts processed.`).catch(console.error);
            }).catch(err => {
                interaction.followUp(`❌ Queue error: ${err.message}`).catch(console.error);
            });
        }
        else if (commandName === 'force_stop_all') {
            // Admin check
            const adminRoleId = await (0,_db_js__WEBPACK_IMPORTED_MODULE_2__/* .getAdminRole */ .Gx)();
            const hasAdminRole = adminRoleId && interaction.member.roles.cache.has(adminRoleId);
            const isDiscordAdmin = interaction.memberPermissions.has('Administrator');

            if (!hasAdminRole && !isDiscordAdmin) {
                await interaction.reply({ content: '❌ Admin permission required.', ephemeral: true });
                return;
            }

            (0,_manager_js__WEBPACK_IMPORTED_MODULE_3__/* .forceStop */ .uq)();
            await interaction.reply('🛑 **KILL-SWITCH ACTIVATED** - All processes will stop at next checkpoint.');
        }
        else if (commandName === 'list_my_accounts') {
            // Future enhancement: filter by Discord user ID
            await interaction.reply({ content: 'This feature will be available soon!', ephemeral: true });
        }
        else if (commandName === 'toggle_ping') {
            // Future enhancement: toggle ping notifications
            await interaction.reply({ content: 'This feature will be available soon!', ephemeral: true });
        }
        else if (commandName === 'set_log_channel') {
            // Admin check
            if (!interaction.memberPermissions.has('Administrator')) {
                await interaction.reply({ content: '❌ Admin permission required.', ephemeral: true });
                return;
            }

            const channel = interaction.options.getChannel('channel');
            await (0,_db_js__WEBPACK_IMPORTED_MODULE_2__/* .setLogChannel */ .WT)(channel.id);
            await interaction.reply({ content: `✅ Log channel set to ${channel}. All bot notifications will be sent here.`, ephemeral: true });
        }
        else if (commandName === 'mute_bot' || commandName === 'unmute_bot') {
            // Admin check
            const adminRoleId = await (0,_db_js__WEBPACK_IMPORTED_MODULE_2__/* .getAdminRole */ .Gx)();
            const hasAdminRole = adminRoleId && interaction.member.roles.cache.has(adminRoleId);
            const isDiscordAdmin = interaction.memberPermissions.has('Administrator');

            if (!hasAdminRole && !isDiscordAdmin) {
                await interaction.reply({ content: '❌ Admin permission required.', ephemeral: true });
                return;
            }

            const action = commandName === 'mute_bot' ? 'muted' : 'unmuted';
            await interaction.reply({ content: `✅ Bot messages ${action}`, ephemeral: true });
        }
        else if (commandName === 'remove_account') {
            const name = interaction.options.getString('name');
            const removed = await (0,_db_js__WEBPACK_IMPORTED_MODULE_2__/* .removeAccount */ .At)(name);

            if (removed) {
                await interaction.reply({ content: `Account **${name}** removed successfully.`, ephemeral: true });
            } else {
                await interaction.reply({ content: `Account **${name}** not found.`, ephemeral: true });
            }
        }
        else if (commandName === 'set_schedule') {
            const start = interaction.options.getInteger('start_hour');
            const end = interaction.options.getInteger('end_hour');

            if (start < 0 || start > 23 || end < 0 || end > 23) {
                await interaction.reply({ content: 'Hours must be between 0 and 23.', ephemeral: true });
                return;
            }

            // Validation removed to allow cross-midnight schedules (e.g. 22:00 to 08:00)
            // if (start >= end) { ... }

            // Format as HH:00
            const startStr = `${start.toString().padStart(2, '0')}:00`;
            const endStr = `${end.toString().padStart(2, '0')}:00`;

            await (0,_db_js__WEBPACK_IMPORTED_MODULE_2__/* .setSchedule */ .KV)(startStr, endStr);
            await interaction.reply({ content: `✅ Schedule updated! Active hours: **${startStr}** to **${endStr}**` });
        }
        else if (commandName === 'set_cookies') {
            const cookies = interaction.options.getString('cookies');
            // Basic validation
            if (!cookies || cookies.length < 5) {
                await interaction.reply({ content: 'Invalid cookie string provided.', ephemeral: true });
                return;
            }
            await (0,_db_js__WEBPACK_IMPORTED_MODULE_2__/* .setCookies */ .St)(cookies);
            await interaction.reply({ content: '✅ Global session cookies updated! New sessions will use these cookies.', ephemeral: true });
        }
        else if (commandName === 'set_admin_role') {
            // Check Discord Admin permissions
            if (!interaction.memberPermissions.has('Administrator')) {
                await interaction.reply({ content: '❌ Only Server Administrators can use this command.', ephemeral: true });
                return;
            }

            const role = interaction.options.getRole('role');
            await (0,_db_js__WEBPACK_IMPORTED_MODULE_2__/* .setAdminRole */ .ES)(role.id);
            await interaction.reply({ content: `✅ Admin role set to **${role.name}**. Users with this role can now manage the bot.` });
        }
    } catch (error) {
        console.error('[Discord] Interaction Error:', error);
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true }).catch(console.error);
        } else {
            await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true }).catch(console.error);
        }
    }
});

const startBot = () => {
    client.login(process.env.DISCORD_TOKEN);
};



const sendLog = async (message, type = 'info') => {
    // Try db first, fallback to env
    let channelId = await (0,_db_js__WEBPACK_IMPORTED_MODULE_2__/* .getLogChannel */ .ad)();
    console.log('[DEBUG] sendLog called - channelId from db:', channelId);
    if (!channelId) {
        channelId = process.env.LOG_CHANNEL_ID;
        console.log('[DEBUG] channelId from env:', channelId);
    }

    if (!channelId) {
        console.log('[DEBUG] No channelId found - exiting sendLog');
        return; // No logging channel configured
    }

    console.log('[DEBUG] Fetching Discord channel...');
    const channel = await client.channels.fetch(channelId).catch((err) => {
        console.error('[DEBUG] Channel fetch error:', err.message);
        return null;
    });
    if (!channel) {
        console.error('[DEBUG] Channel is null!');
        return;
    }
    console.log('[DEBUG] Channel fetched OK, preparing message...');

    let color = 0x0099ff; // Blue (Info)
    if (type === 'success') color = 0x00ff00; // Green
    if (type === 'error') color = 0xff0000; // Red
    if (type === 'start') color = 0xffff00; // Yellow

    const embed = new discord_js__WEBPACK_IMPORTED_MODULE_0__.EmbedBuilder()
        .setDescription(message)
        .setColor(color)
        .setTimestamp();

    // Retry logic - try up to 3 times
    for (let attempt = 1; attempt <= 3; attempt++) {
        try {
            await channel.send({ embeds: [embed] });
            console.log('[DEBUG] ✅ Message sent to Discord!');
            return; // Success - exit
        } catch (err) {
            console.error(`[sendLog] Attempt ${attempt}/3 failed:`, err.message);
            if (attempt < 3) {
                // Wait before retry (exponential backoff)
                await new Promise(r => setTimeout(r, attempt * 1000));
            }
        }
    }
    console.error('[sendLog] Failed to send log after 3 attempts');
};

__webpack_async_result__();
} catch(e) { __webpack_async_result__(e); } });

/***/ }),

/***/ 717:
/***/ (function(__unused_webpack_module, __webpack_exports__, __nccwpck_require__) {

"use strict";
/* harmony export */ __nccwpck_require__.d(__webpack_exports__, {
/* harmony export */   D: () => (/* binding */ RustBrain)
/* harmony export */ });
/* harmony import */ var child_process__WEBPACK_IMPORTED_MODULE_0__ = __nccwpck_require__(317);
/* harmony import */ var child_process__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__nccwpck_require__.n(child_process__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var path__WEBPACK_IMPORTED_MODULE_1__ = __nccwpck_require__(928);
/* harmony import */ var path__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__nccwpck_require__.n(path__WEBPACK_IMPORTED_MODULE_1__);


// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

class RustBrain {
    constructor() {
        this.process = null;
        this.ready = false;
        this.responseHandlers = [];
    }

    async start() {
        return new Promise((resolve, reject) => {
            // Platform-aware executable name
            const exeName = process.platform === 'win32' ? 'evertext_brain.exe' : 'evertext_brain';
            const brainPath = path__WEBPACK_IMPORTED_MODULE_1___default().join(process.cwd(), 'evertext_brain/target/release', exeName);

            console.log('[Brain] Starting Rust brain:', brainPath);

            this.process = (0,child_process__WEBPACK_IMPORTED_MODULE_0__.spawn)(brainPath, [], {
                stdio: ['pipe', 'pipe', 'pipe']
            });

            this.process.on('error', (err) => {
                console.error('[Brain] Failed to start:', err);
                reject(err);
            });

            this.process.stdout.on('data', (data) => {
                const text = data.toString();

                // OPTIMIZATION: Handle potential fragmented JSON (simple buffer)
                // For now, we assume simple line-based protocol from Rust brain

                const lines = text.split('\n').filter(l => l.trim());
                for (const line of lines) {
                    try {
                        const response = JSON.parse(line);

                        // --- Log Truncation & Optimization ---
                        // Don't log keep-alives or noisy events
                        if (response.action !== 'heartbeat') {
                            const logResponse = { ...response };
                            if (logResponse.payload && logResponse.payload.length > 100) {
                                logResponse.payload = `[TRUNCATED] ${logResponse.payload.substring(0, 50)}...`;
                            }
                            console.log('[Brain] Response:', logResponse);
                        }
                        // -------------------------------------

                        if (response.action === 'ready') {
                            this.ready = true;
                            resolve();
                        }

                        // Call the pending handler if exists
                        if (this.responseHandlers.length > 0) {
                            const handler = this.responseHandlers.shift();
                            handler(response);
                        }
                    } catch (e) {
                        // Common issue: Rust panic or non-JSON output
                        if (line.includes('panic')) {
                            console.error('🔥 [Brain] CRITICAL: RUST PANIC DETECTED ->', line);
                        } else {
                            console.warn('[Brain] Skipped non-JSON output:', line.substring(0, 100));
                        }
                    }
                }
            });

            this.process.stderr.on('data', (data) => {
                console.error('[Brain] Stderr:', data.toString());
            });

            this.process.on('exit', (code) => {
                console.log('[Brain] Process exited with code:', code);
                this.ready = false;
                // Clear all pending handlers
                while (this.responseHandlers.length > 0) {
                    const handler = this.responseHandlers.shift();
                    handler({ action: 'error', message: 'Brain process died' });
                }
            });

            // Send init message
            this.sendMessage({ type: 'init' });
        });
    }

    sendMessage(msg) {
        if (!this.process) {
            throw new Error('Brain process not started');
        }

        // --- Log Truncation ---
        const logMsg = { ...msg };
        if (logMsg.content && logMsg.content.length > 100) {
            logMsg.content = `[TRUNCATED] (${logMsg.content.length} chars) - ${logMsg.content.substring(0, 50)}...`;
        }
        console.log('[Brain] Sending:', JSON.stringify(logMsg));
        // ----------------------

        const json = JSON.stringify(msg);
        this.process.stdin.write(json + '\n');
    }

    async sendAndWait(msg, timeoutMs = 30000) {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                // Remove handler from queue
                const index = this.responseHandlers.indexOf(resolve);
                if (index > -1) {
                    this.responseHandlers.splice(index, 1);
                }
                reject(new Error('Brain response timeout'));
            }, timeoutMs);

            const wrappedResolve = (response) => {
                clearTimeout(timeout);
                resolve(response);
            };

            this.responseHandlers.push(wrappedResolve);
            this.sendMessage(msg);
        });
    }

    async processTerminalOutput(content, account) {
        const response = await this.sendAndWait({
            type: 'terminal_output',
            content,
            account: {
                name: account.name,
                code: account.code,
                targetServer: account.targetServer,
                server_toggle: account.serverToggle // Send as snake_case for Rust
            }
        });
        return response;
    }

    async stop() {
        if (this.process) {
            console.log('[Brain] Stopping brain process...');

            // Send SIGTERM for graceful shutdown
            this.process.kill('SIGTERM');

            // Wait for exit event with timeout
            await new Promise((resolve) => {
                const timeout = setTimeout(() => {
                    console.log('[Brain] Process did not exit gracefully, forcing kill');
                    if (this.process) {
                        this.process.kill('SIGKILL');
                    }
                    resolve();
                }, 5000); // 5 second grace period

                if (this.process) {
                    this.process.once('exit', () => {
                        clearTimeout(timeout);
                        resolve();
                    });
                }
            });

            this.process = null;
            this.ready = false;
        }
    }
}


/***/ }),

/***/ 714:
/***/ (function(__unused_webpack_module, __webpack_exports__, __nccwpck_require__) {

"use strict";
/* harmony export */ __nccwpck_require__.d(__webpack_exports__, {
/* harmony export */   f: () => (/* binding */ BrowserController)
/* harmony export */ });
/* harmony import */ var puppeteer__WEBPACK_IMPORTED_MODULE_0__ = __nccwpck_require__(659);
/* harmony import */ var puppeteer__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__nccwpck_require__.n(puppeteer__WEBPACK_IMPORTED_MODULE_0__);


const GAME_URL = 'https://evertext.sytes.net';

class BrowserController {
    constructor() {
        this.browser = null;
        this.context = null; // Store Incognito Context
        this.page = null;
    }

    // New Arg: sharedBrowser instance (optional)
    async launch(sessionCookie, sharedBrowser = null) {
        console.log('[Browser] Launching Session...');

        if (sharedBrowser) {
            console.log('[Browser] Reusing existing browser instance');
            this.browser = sharedBrowser;
        } else {
            // Launch new browser if none provided
            console.log('[Browser] Starting new Chromium process...');
            this.browser = await puppeteer__WEBPACK_IMPORTED_MODULE_0___default().launch({
                headless: false, // Show GUI for user
                timeout: 30000,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-gpu',
                    '--disable-software-rasterizer',
                    '--disable-accelerated-2d-canvas',
                    '--disable-accelerated-video-decode',
                    '--disable-3d-apis',
                    '--no-zygote',
                    '--disable-extensions',
                    '--disable-component-extensions-with-background-pages',
                    '--disable-default-apps',
                    '--disable-sync',
                    '--disable-translate',
                    '--disable-notifications',
                    '--disable-speech-api',
                    '--disable-webgl',
                    '--disable-web-security',
                    '--disk-cache-size=1',
                    '--media-cache-size=1',
                    '--aggressive-cache-discard',
                    '--disable-cache',
                    '--disable-application-cache',
                    '--disable-offline-load-stale-cache',
                    '--disable-renderer-backgrounding',
                    '--disable-background-timer-throttling',
                    '--disable-backgrounding-occluded-windows',
                    '--disable-ipc-flooding-protection',
                    '--js-flags=--max-old-space-size=128',
                    '--window-size=800,600',
                    '--no-first-run',
                    '--mute-audio'
                ]
            });
        }

        // --- OPTIMIZATION: Incognito Context ---
        // Creates a clean slate instantly (no cookies/cache from previous run)
        console.log('[Browser] Creating Incognito Context...');
        this.context = await this.browser.createBrowserContext();
        this.page = await this.context.newPage();

        await this.page.setViewport({ width: 800, height: 600 });

        // Inject session cookie
        if (sessionCookie) {
            console.log('[Browser] Injecting session cookie...');
            await this.page.setCookie({
                name: 'session',
                value: sessionCookie,
                domain: new URL(GAME_URL).hostname,
                path: '/',
                httpOnly: true
            });
        }

        //Navigate to game
        console.log('[Browser] Navigating to game terminal...');
        await this.page.goto(GAME_URL, { waitUntil: 'domcontentloaded', timeout: 15000 });

        console.log('[Browser] Browser ready');
    }

    async clickStart() {
        if (!this.page) throw new Error('Browser not launched');

        console.log('[Browser] Preparing to start terminal...');

        // Wait for button to be available
        await this.page.waitForSelector('#startBtn', { timeout: 10000 });

        // Check if button is disabled (previous session still running)
        const isDisabled = await this.page.evaluate(() => {
            return document.getElementById('startBtn').disabled;
        });

        if (isDisabled) {
            console.log('[Browser] Start button disabled. Refreshing...');
            await this.page.reload({ waitUntil: 'domcontentloaded' });
            await this.page.waitForSelector('#startBtn', { timeout: 10000 });
        }

        console.log('[Browser] Clicking Start button...');
        await this.page.click('#startBtn');

        // Wait for terminal to initialize
        await this.page.waitForSelector('#connection_status', { timeout: 10000 });

        // Give terminal a moment to fully connect
        await new Promise(r => setTimeout(r, 1000));

        console.log('[Browser] Terminal started and ready');
    }

    async clickStop() {
        if (!this.page) throw new Error('Browser not launched');

        console.log('[Browser] Clicking Stop button...');

        try {
            // Check if stop button exists
            const stopBtn = await this.page.$('#stopBtn');
            if (stopBtn) {
                await this.page.click('#stopBtn');

                // --- OPTIMIZATION: Smart Waiting (Item 3) ---
                console.log('[Browser] Waiting for terminal process to stop...');
                try {
                    // Poll element state instead of hard sleep
                    // Wait until Start Button is ENABLED again
                    await this.page.waitForFunction(() => {
                        const btn = document.getElementById('startBtn');
                        return btn && !btn.disabled;
                    }, { timeout: 5000, polling: 200 }); // Check every 200ms
                    console.log('[Browser] Terminal fully stopped (Start button re-enabled)');
                } catch (e) {
                    console.log('[Browser] Warning: Stop confirmation timed out, but proceeding.');
                }

            } else {
                console.log('[Browser] Stop button not found (terminal probably already stopped)');
            }
        } catch (e) {
            console.log('[Browser] Failed to click stop:', e.message);
        }
    }

    async refresh() {
        if (!this.page) throw new Error('Browser not launched');

        console.log('[Browser] Refreshing page...');
        await this.page.reload({ waitUntil: 'domcontentloaded' });
    }

    async isLoginRequired() {
        if (!this.page) throw new Error('Browser not launched');

        const loginLink = await this.page.$('a[href="/auth/google"]');
        return loginLink !== null;
    }

    async close() {
        // Close Context (Incognito Tab)
        if (this.context) {
            console.log('[Browser] Closing Incognito Context...');
            try { await this.context.close(); } catch (e) { }
            this.context = null;
            this.page = null;
        }

        // IMPORTANT: We do NOT close this.browser here if it was shared.
        // The manager handles closing the actual browser process.
        // If we created it internally (this.browser not shared), we might want to?
        // But for this hybrid design, we rely on the caller to manage the 'browser' instance
        // if they passed it in. If we created it, we should close it? 
        // Let's refine: The Manager owns the browser process. This controller owns the Context.
    }

    isLaunched() {
        return this.page !== null;
    }
}


/***/ }),

/***/ 847:
/***/ (function(__unused_webpack_module, __webpack_exports__, __nccwpck_require__) {

"use strict";
/* harmony export */ __nccwpck_require__.d(__webpack_exports__, {
/* harmony export */   $: () => (/* binding */ config)
/* harmony export */ });
// Central configuration for the bot
// All timeout values and constants in one place

const config = {
    // Time limits (in milliseconds)
    IDLE_TIMEOUT_MS: 90000,        // 90 seconds - Terminal idle timeout
    MAX_SESSION_TIME_MS: 1200000,  // 20 minutes - Max session duration
    MAX_WAIT_TIME_MS: 600000,      // 10 minutes - Max wait for terminal slot
    CONNECT_TIMEOUT_MS: 600000,    // 10 minutes - WebSocket connection timeout
    DEFER_WAIT_TIME_MS: 600000,    // 10 minutes - Wait time after defer

    // WebSocket timeouts
    WS_CONNECTION_TIMEOUT_MS: 15000, // 15 seconds - Initial connection
    WS_PING_INTERVAL_MULTIPLIER: 0.8, // Send ping before server expects
    WS_COMMAND_DELAY_MS: 300,        // Delay between commands

    // Browser delays
    BROWSER_WAIT_AFTER_START_MS: 1000,  // Wait after clicking Start
    BROWSER_WAIT_AFTER_STOP_MS: 3000,   // Wait after clicking Stop
    BROWSER_PROCESS_CLEANUP_MS: 5000,   // Wait for process cleanup
    BROWSER_INITIAL_DATA_WAIT_MS: 2000, // Wait for initial data
    BROWSER_EXTRA_WAIT_MS: 3000,        // Extra wait if no data
    BROWSER_RECONNECT_WAIT_MS: 2000,    // Wait after reconnect

    // Manager delays
    ACCOUNT_DELAY_MS: 10000,           // Wait between accounts
    TERMINAL_FULL_RETRY_DELAY_MS: 30000, // Wait before retry when full

    // Retry logic
    MAX_RETRY_ATTEMPTS: 3,             // Max retries per account
    MAX_DEFER_CYCLES: 3,               // Max times an account can be deferred

    // Brain timeouts
    BRAIN_RESPONSE_TIMEOUT_MS: 30000,  // 30 seconds - Max wait for brain response

    // Terminal capacity
    DEFAULT_MAX_USERS: 4,              // Default terminal capacity
    SLOT_CHECK_INTERVAL_MS: 1000,      // Check slot availability every second

    // Context windows
    SERVER_LIST_CONTEXT_CHARS: 5000,   // Characters to send for server selection
};


/***/ }),

/***/ 467:
/***/ (function(module, __webpack_exports__, __nccwpck_require__) {

"use strict";
__nccwpck_require__.a(module, async (__webpack_handle_async_dependencies__, __webpack_async_result__) => { try {
/* harmony export */ __nccwpck_require__.d(__webpack_exports__, {
/* harmony export */   At: () => (/* binding */ removeAccount),
/* harmony export */   ES: () => (/* binding */ setAdminRole),
/* harmony export */   F7: () => (/* binding */ addAccount),
/* harmony export */   Gx: () => (/* binding */ getAdminRole),
/* harmony export */   Jg: () => (/* binding */ updateAccountStatus),
/* harmony export */   KV: () => (/* binding */ setSchedule),
/* harmony export */   MM: () => (/* binding */ getAccountDecrypted),
/* harmony export */   P4: () => (/* binding */ getAccounts),
/* harmony export */   Qp: () => (/* binding */ resetErrorStatuses),
/* harmony export */   St: () => (/* binding */ setCookies),
/* harmony export */   WT: () => (/* binding */ setLogChannel),
/* harmony export */   ad: () => (/* binding */ getLogChannel),
/* harmony export */   fr: () => (/* binding */ resetAllStatuses),
/* harmony export */   getCookies: () => (/* binding */ getCookies),
/* harmony export */   w: () => (/* binding */ encrypt)
/* harmony export */ });
/* unused harmony exports decrypt, isEncrypted, migrateUnencryptedCodes, getSchedule, db */
/* harmony import */ var lowdb_node__WEBPACK_IMPORTED_MODULE_0__ = __nccwpck_require__(92);
/* harmony import */ var lowdb_node__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__nccwpck_require__.n(lowdb_node__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var crypto_js__WEBPACK_IMPORTED_MODULE_1__ = __nccwpck_require__(516);
/* harmony import */ var crypto_js__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__nccwpck_require__.n(crypto_js__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var dotenv__WEBPACK_IMPORTED_MODULE_2__ = __nccwpck_require__(285);
/* harmony import */ var dotenv__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__nccwpck_require__.n(dotenv__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var fs_promises__WEBPACK_IMPORTED_MODULE_3__ = __nccwpck_require__(943);
/* harmony import */ var fs_promises__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__nccwpck_require__.n(fs_promises__WEBPACK_IMPORTED_MODULE_3__);





dotenv__WEBPACK_IMPORTED_MODULE_2___default().config();

const defaultData = { accounts: [], settings: { scheduleStart: '10:00', scheduleEnd: '20:00' } };
const db = await (0,lowdb_node__WEBPACK_IMPORTED_MODULE_0__.JSONFilePreset)('db.json', defaultData);

const SECRET_KEY = process.env.ENCRYPTION_KEY || 'default_secret_please_change';

// In-memory cache to reduce file reads (Issue #27 fix)
let dbCache = null;
let lastRead = 0;
const CACHE_TTL = 5000; // 5 seconds

// Helper to get cached data
const getCachedData = async () => {
  const now = Date.now();
  if (!dbCache || (now - lastRead) > CACHE_TTL) {
    await db.read();
    dbCache = JSON.parse(JSON.stringify(db.data)); // Deep clone
    lastRead = now;
  }
  return dbCache;
};

// Helper to invalidate cache after write
// NOW ATOMIC: Writes to temp file first, then renames
const writeAndInvalidate = async () => {
  const dbPath = 'db.json';
  const tempPath = 'db.json.tmp';
  const backupPath = 'db.json.backup';

  try {
    // 0. Backup (optional but good)
    try {
      await fs_promises__WEBPACK_IMPORTED_MODULE_3___default().copyFile(dbPath, backupPath);
    } catch (e) { /* First run, no backup */ }

    // 1. Write to temp file
    await fs_promises__WEBPACK_IMPORTED_MODULE_3___default().writeFile(tempPath, JSON.stringify(db.data, null, 2));

    // 2. Atomic rename (replaces old file)
    await fs_promises__WEBPACK_IMPORTED_MODULE_3___default().rename(tempPath, dbPath);

    // 3. Invalidate cache
    dbCache = null;
  } catch (err) {
    console.error('[DB] Atomic write failed:', err);
    // Cleanup temp file if it exists
    try { await fs_promises__WEBPACK_IMPORTED_MODULE_3___default().unlink(tempPath); } catch { }
    throw err;
  }
};

const encrypt = (text) => {
  return crypto_js__WEBPACK_IMPORTED_MODULE_1___default().AES.encrypt(text, SECRET_KEY).toString();
};

const decrypt = (ciphertext) => {
  const bytes = crypto_js__WEBPACK_IMPORTED_MODULE_1___default().AES.decrypt(ciphertext, SECRET_KEY);
  return bytes.toString((crypto_js__WEBPACK_IMPORTED_MODULE_1___default().enc).Utf8);
};

const isEncrypted = (text) => {
  // Check if text looks like encrypted data (AES encrypted strings contain special characters)
  // A simple heuristic: encrypted text from CryptoJS.AES is base64-like and contains '==' or special chars
  try {
    const bytes = crypto_js__WEBPACK_IMPORTED_MODULE_1___default().AES.decrypt(text, SECRET_KEY);
    const decrypted = bytes.toString((crypto_js__WEBPACK_IMPORTED_MODULE_1___default().enc).Utf8);
    // If decryption produces valid UTF-8 and the original doesn't match (i.e., it was encrypted), return true
    // If it fails or produces empty string, it's likely not encrypted
    return decrypted.length > 0 && text !== decrypted;
  } catch (e) {
    return false;
  }
};

const migrateUnencryptedCodes = async () => {
  await db.read();
  let migratedCount = 0;

  for (const account of db.data.accounts) {
    if (!isEncrypted(account.encryptedCode)) {
      console.log(`[DB] Migrating plain-text code for account: ${account.name}`);
      account.encryptedCode = encrypt(account.encryptedCode);
      migratedCount++;
    }
  }

  if (migratedCount > 0) {
    await writeAndInvalidate();
    console.log(`[DB] Migration complete. Encrypted ${migratedCount} account(s).`);
  } else {
    console.log('[DB] No migration needed. All codes are encrypted.');
  }

  return migratedCount;
};

const addAccount = async (name, encryptedCode, targetServer, serverToggle = true) => {
  await db.read();

  // Prevent duplicate names
  if (db.data.accounts.find(acc => acc.name === name)) {
    // Overwrite existing? Or throw error? For now, overwrite
    const index = db.data.accounts.findIndex(acc => acc.name === name);
    db.data.accounts[index] = {
      ...db.data.accounts[index],
      encryptedCode,
      targetServer,
      serverToggle, // Save the toggle
      status: 'pending' // Reset status on update
    };
  } else {
    db.data.accounts.push({
      id: Date.now().toString(),
      name,
      encryptedCode,
      targetServer,
      serverToggle, // Save the toggle
      lastRun: null,
      status: 'pending'
    });
  }

  await writeAndInvalidate();
  return true;
};

const getAccounts = async () => {
  const data = await getCachedData();
  return data.accounts;
};

const removeAccount = async (name) => {
  await db.read();
  const initialLength = db.data.accounts.length;
  db.data.accounts = db.data.accounts.filter(a => a.name !== name);
  await writeAndInvalidate();
  return db.data.accounts.length < initialLength;
};

const updateAccountStatus = async (id, status, lastRun = null) => {
  await db.read();
  const account = db.data.accounts.find(a => a.id === id);
  if (account) {
    account.status = status;
    if (lastRun) account.lastRun = lastRun;
    await writeAndInvalidate();
  }
};

const getAccountDecrypted = async (id) => {
  await db.read();
  const account = db.data.accounts.find(a => a.id === id);
  if (!account) {
    throw new Error(`Account with ID ${id} not found`);
  }
  return {
    ...account,
    code: decrypt(account.encryptedCode)
  };
};

const getSchedule = async () => {
  const data = await getCachedData();
  return data.settings || { scheduleStart: '10:00', scheduleEnd: '20:00' };
};

const setSchedule = async (start, end) => {
  await db.read();
  db.data.settings = { ...db.data.settings, scheduleStart: start, scheduleEnd: end };
  await writeAndInvalidate();
  return db.data.settings;
};

const setCookies = async (cookies) => {
  await db.read();

  // Check if already encrypted to prevent double encryption
  let encryptedCookies;
  if (isEncrypted(cookies)) {
    console.log('[DB] Cookies appear to be already encrypted, using as-is');
    encryptedCookies = cookies;
  } else {
    encryptedCookies = encrypt(cookies);
  }

  db.data.settings = { ...db.data.settings, cookies: encryptedCookies };
  await writeAndInvalidate();
  return true;
};

const getAdminRole = async () => {
  const data = await getCachedData();
  return data.settings?.adminRoleId || null;
};

const setAdminRole = async (roleId) => {
  await db.read();
  db.data.settings = { ...db.data.settings, adminRoleId: roleId };
  await writeAndInvalidate();
  return true;
};

const getLogChannel = async () => {
  const data = await getCachedData();
  return data.settings?.logChannelId || null;
};

const setLogChannel = async (channelId) => {
  await db.read();
  db.data.settings = { ...db.data.settings, logChannelId: channelId };
  await writeAndInvalidate();
  return true;
};

const resetAllStatuses = async () => {
  await db.read();
  for (const account of db.data.accounts) {
    account.status = 'pending';
  }
  await writeAndInvalidate();
  console.log('[DB] All account statuses reset to pending');
};

const resetErrorStatuses = async () => {
  await db.read();
  let count = 0;
  for (const account of db.data.accounts) {
    if (account.status === 'error') {
      account.status = 'pending';
      count++;
    }
  }
  if (count > 0) {
    await writeAndInvalidate();
  }
  console.log(`[DB] Reset ${count} error statuses to pending`);
  return count;
};

const getCookies = async () => {
  await db.read();
  const cookies = db.data.settings?.cookies;
  if (!cookies) return null;

  try {
    // Attempt to decrypt
    const decrypted = decrypt(cookies);
    // If decryption results in empty string, it failed or key is wrong
    if (!decrypted || decrypted.length === 0) {
      console.warn('[DB] Cookie decryption failed (empty result). Returning null.');
      return null;
    }
    return decrypted;
  } catch (e) {
    // If decryption throws, it might be legacy plain text?
    // But decrypt() wraps CryptoJS which usually doesn't throw on simple bad key, it returns Malformed.
    // If we assume strict encryption now, we should check if it LOOKS encrypted.
    if (isEncrypted(cookies)) {
      console.warn('[DB] Cookie decryption failed. Returning null.');
      return null; // Don't return garbage
    }
    return cookies; // Legacy fallback
  }
};

// Run migration on module load to fix any existing plain-text codes
await migrateUnencryptedCodes();



__webpack_async_result__();
} catch(e) { __webpack_async_result__(e); } }, 1);

/***/ }),

/***/ 681:
/***/ (function(__unused_webpack_module, __webpack_exports__, __nccwpck_require__) {

"use strict";

// EXPORTS
__nccwpck_require__.d(__webpack_exports__, {
  wU: () => (/* binding */ startHealthServer),
  J0: () => (/* binding */ updateActivity)
});

// UNUSED EXPORTS: setHealthy

;// CONCATENATED MODULE: external "http"
const external_http_namespaceObject = __WEBPACK_EXTERNAL_createRequire(import.meta.url)("http");
var external_http_default = /*#__PURE__*/__nccwpck_require__.n(external_http_namespaceObject);
;// CONCATENATED MODULE: ./src/health-server.js


let isHealthy = true;
let lastActivityTime = Date.now();

function startHealthServer(port = 3000) {
    const server = external_http_default().createServer((req, res) => {
        if (req.url === '/health' || req.url === '/ping') {
            const uptimeSeconds = Math.floor(process.uptime());
            const timeSinceActivity = Date.now() - lastActivityTime;

            // Consider unhealthy if no activity for 30 min (customizable)
            // For now, we just report stats. 
            // In future, you can set `isHealthy = false` on critical errors.
            const healthy = isHealthy;

            res.writeHead(healthy ? 200 : 503, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                status: healthy ? 'ok' : 'degraded',
                uptime: uptimeSeconds,
                lastActivitySeconds: Math.floor(timeSinceActivity / 1000),
                memoryMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
            }));
        } else {
            res.writeHead(404);
            res.end('Not Found');
        }
    });

    server.listen(port, () => {
        console.log(`[Health] Server listening on port ${port}`);
    });

    server.on('error', (err) => {
        console.error('[Health] Server error:', err.message);
    });
}

function updateActivity() {
    lastActivityTime = Date.now();
}

function setHealthy(healthy) {
    isHealthy = healthy;
}


/***/ }),

/***/ 675:
/***/ (function(__unused_webpack_module, __webpack_exports__, __nccwpck_require__) {

"use strict";
/* harmony export */ __nccwpck_require__.d(__webpack_exports__, {
/* harmony export */   V: () => (/* binding */ rotateLogs)
/* harmony export */ });
/* harmony import */ var fs_promises__WEBPACK_IMPORTED_MODULE_0__ = __nccwpck_require__(943);
/* harmony import */ var fs_promises__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__nccwpck_require__.n(fs_promises__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var path__WEBPACK_IMPORTED_MODULE_1__ = __nccwpck_require__(928);
/* harmony import */ var path__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__nccwpck_require__.n(path__WEBPACK_IMPORTED_MODULE_1__);



// Clean logs older than 24 hours
const rotateLogs = async () => {
    try {
        const logDir = './logs'; // Assuming logs are here, or just root
        // For this bot, logs are mostly stdout, but let's check for any .log files
        // If you don't save files, this cleans temp files or screenshots

        const files = await fs_promises__WEBPACK_IMPORTED_MODULE_0___default().readdir('.');
        const now = Date.now();
        const MAX_AGE = 24 * 60 * 60 * 1000; // 24 Hours

        let deletedCount = 0;

        for (const file of files) {
            if (file.endsWith('.log') || file.endsWith('.tmp') || file.endsWith('.png')) {
                const stats = await fs_promises__WEBPACK_IMPORTED_MODULE_0___default().stat(file);
                if (now - stats.mtimeMs > MAX_AGE) {
                    await fs_promises__WEBPACK_IMPORTED_MODULE_0___default().unlink(file);
                    deletedCount++;
                }
            }
        }

        if (deletedCount > 0) {
            console.log(`[Maintenance] Cleaned up ${deletedCount} old temp/log files.`);
        }
    } catch (err) {
        console.error('[Maintenance] Log rotation failed:', err.message);
    }
};


/***/ }),

/***/ 110:
/***/ (function(module, __webpack_exports__, __nccwpck_require__) {

"use strict";
__nccwpck_require__.a(module, async (__webpack_handle_async_dependencies__, __webpack_async_result__) => { try {
/* harmony export */ __nccwpck_require__.d(__webpack_exports__, {
/* harmony export */   MH: () => (/* binding */ executeSession),
/* harmony export */   a7: () => (/* binding */ runBatch),
/* harmony export */   uq: () => (/* binding */ forceStop),
/* harmony export */   wP: () => (/* binding */ startScheduler)
/* harmony export */ });
/* unused harmony exports executeFountain, runFountainBatch */
/* harmony import */ var node_cron__WEBPACK_IMPORTED_MODULE_0__ = __nccwpck_require__(380);
/* harmony import */ var node_cron__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__nccwpck_require__.n(node_cron__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _db_js__WEBPACK_IMPORTED_MODULE_1__ = __nccwpck_require__(467);
/* harmony import */ var _runner_js__WEBPACK_IMPORTED_MODULE_2__ = __nccwpck_require__(15);
/* harmony import */ var _bot_js__WEBPACK_IMPORTED_MODULE_3__ = __nccwpck_require__(988);
/* harmony import */ var _async_lock_js__WEBPACK_IMPORTED_MODULE_7__ = __nccwpck_require__(277);
/* harmony import */ var _config_js__WEBPACK_IMPORTED_MODULE_4__ = __nccwpck_require__(847);
/* harmony import */ var _health_server_js__WEBPACK_IMPORTED_MODULE_5__ = __nccwpck_require__(681);
/* harmony import */ var _log_rotator_js__WEBPACK_IMPORTED_MODULE_6__ = __nccwpck_require__(675);
var __webpack_async_dependencies__ = __webpack_handle_async_dependencies__([_db_js__WEBPACK_IMPORTED_MODULE_1__, _runner_js__WEBPACK_IMPORTED_MODULE_2__, _bot_js__WEBPACK_IMPORTED_MODULE_3__]);
([_db_js__WEBPACK_IMPORTED_MODULE_1__, _runner_js__WEBPACK_IMPORTED_MODULE_2__, _bot_js__WEBPACK_IMPORTED_MODULE_3__] = __webpack_async_dependencies__.then ? (await __webpack_async_dependencies__)() : __webpack_async_dependencies__);









const lock = new _async_lock_js__WEBPACK_IMPORTED_MODULE_7__/* .AsyncLock */ .m(); // Prevent race conditions
let isRunning = false;
let shouldStop = false; // Kill-switch flag
const deferredAccounts = new Map(); // Track deferred accounts with timestamps
const deferCycles = new Map(); // Track defer cycle count per account

const forceStop = () => {
    console.log('[Manager] 🛑 FORCE STOP activated');
    shouldStop = true;
};

const startScheduler = () => {
    console.log('[Manager] Scheduler started.');
    const now = new Date();
    console.log(`[Manager] Current system time: ${now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST`);
    console.log(`[Manager] Next daily reset scheduled for: 00:00 IST (Asia/Kolkata timezone)`);

    // Clean old logs on startup
    (0,_log_rotator_js__WEBPACK_IMPORTED_MODULE_6__/* .rotateLogs */ .V)().catch(err => console.error('[Manager] Log rotation error:', err));

    // Daily reset at 00:00 IST (Asia/Kolkata timezone)
    node_cron__WEBPACK_IMPORTED_MODULE_0___default().schedule('0 0 * * *', async () => {
        const triggerTime = new Date();
        console.log(`[Manager] Daily reset triggered at ${triggerTime.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST`);
        await (0,_db_js__WEBPACK_IMPORTED_MODULE_1__/* .resetAllStatuses */ .fr)();
        deferredAccounts.clear(); // Clear defer timestamps
        deferCycles.clear(); // Clear defer cycle counts
        (0,_bot_js__WEBPACK_IMPORTED_MODULE_3__/* .sendLog */ .ll)('🔄 **Daily Reset**: All accounts reset to pending status', 'info');

        // Start processing queue automatically
        await processQueueFull();
    }, {
        timezone: 'Asia/Kolkata'
    });

    // Check queue immediately on startup
    console.log('[Manager] access check: Checking queue on startup...');
    processQueueFull().catch(err => console.error('[Manager] Startup queue error:', err));
};

const processQueueFull = async () => {
    // Acquire lock to prevent race condition
    await lock.acquire();

    if (isRunning) {
        console.log('[Manager] Queue already running');
        lock.release();
        return;
    }

    isRunning = true;
    lock.release(); // Release lock after setting flag
    shouldStop = false;
    let sharedBrowser = null;
    const retryCounts = new Map(); // Track retries per account
    const MAX_RETRY_ATTEMPTS = _config_js__WEBPACK_IMPORTED_MODULE_4__/* .config */ .$.MAX_RETRY_ATTEMPTS;

    try {
        const accounts = await (0,_db_js__WEBPACK_IMPORTED_MODULE_1__/* .getAccounts */ .P4)();
        const pendingAccounts = accounts.filter(a => a.status === 'idle' || a.status === 'pending');

        if (pendingAccounts.length === 0) {
            console.log('[Manager] No pending accounts');
            isRunning = false;
            return;
        }

        console.log(`[Manager] Processing ${pendingAccounts.length} accounts...`);
        await (0,_bot_js__WEBPACK_IMPORTED_MODULE_3__/* .sendLog */ .ll)(`▶️ **Queue Started**: Processing ${pendingAccounts.length} accounts`, 'info');

        for (let i = 0; i < pendingAccounts.length; i++) {
            // Check kill-switch
            if (shouldStop) {
                console.log('[Manager] 🛑 Kill-switch activated - stopping queue');
                await (0,_bot_js__WEBPACK_IMPORTED_MODULE_3__/* .sendLog */ .ll)('🛑 **Queue Stopped**: Force stop activated', 'error');
                break;
            }

            const account = pendingAccounts[i];

            // Check if this account is deferred and hasn't waited 10 minutes yet
            if (deferredAccounts.has(account.id)) {
                const deferredTime = deferredAccounts.get(account.id);
                const elapsedMinutes = (Date.now() - deferredTime) / 60000;

                if (elapsedMinutes < 10) {
                    console.log(`[Manager] ⏭️  Skipping ${account.name} - deferred (${Math.floor(10 - elapsedMinutes)} min remaining)`);
                    continue; // Skip this account for now
                } else {
                    // 10 minutes passed, can retry
                    console.log(`[Manager] ✅ Retrying ${account.name} - defer wait complete`);
                    deferredAccounts.delete(account.id);
                }
            }

            try {
                console.log(`\n[Manager] [${i + 1}/${pendingAccounts.length}] Processing ${account.name}...`);
                await (0,_db_js__WEBPACK_IMPORTED_MODULE_1__/* .updateAccountStatus */ .Jg)(account.id, 'running');

                // Run session - pass shared browser
                (0,_health_server_js__WEBPACK_IMPORTED_MODULE_5__/* .updateActivity */ .J0)();
                const result = await (0,_runner_js__WEBPACK_IMPORTED_MODULE_2__/* .runSession */ .I)(await (0,_db_js__WEBPACK_IMPORTED_MODULE_1__/* .getAccountDecrypted */ .MM)(account.id), sharedBrowser);

                if (result.success) {
                    console.log(`[Manager] ✅ ${account.name} completed successfully`);
                    await (0,_db_js__WEBPACK_IMPORTED_MODULE_1__/* .updateAccountStatus */ .Jg)(account.id, 'done', new Date().toISOString());
                    await (0,_bot_js__WEBPACK_IMPORTED_MODULE_3__/* .sendLog */ .ll)(`✅ **${account.name}**: Session completed successfully`, 'success');

                    // Update shared browser reference
                    sharedBrowser = result.browser;

                } else if (result.defer) {
                    const attempts = (retryCounts.get(account.id) || 0) + 1;
                    retryCounts.set(account.id, attempts);

                    // Track defer cycles
                    const cycles = (deferCycles.get(account.id) || 0) + 1;
                    deferCycles.set(account.id, cycles);

                    if (attempts <= MAX_RETRY_ATTEMPTS && cycles <= _config_js__WEBPACK_IMPORTED_MODULE_4__/* .config */ .$.MAX_DEFER_CYCLES) {
                        console.log(`[Manager] ⏭️  ${account.name} deferred (Zigza error) - Attempt ${attempts}/3, Cycle ${cycles}/3`);
                        await (0,_db_js__WEBPACK_IMPORTED_MODULE_1__/* .updateAccountStatus */ .Jg)(account.id, 'deferred');
                        await (0,_bot_js__WEBPACK_IMPORTED_MODULE_3__/* .sendLog */ .ll)(`⚠️ **${account.name}**: Deferred (Zigza) - Attempt ${attempts}/3, Cycle ${cycles}/3`, 'warning');

                        // Mark defer timestamp
                        deferredAccounts.set(account.id, Date.now());
                        // Add to end of queue
                        pendingAccounts.push(account);

                        sharedBrowser = result.browser;
                    } else {
                        console.log(`[Manager] ❌ ${account.name} failed: Max Zigza retries or defer cycles reached`);
                        await (0,_db_js__WEBPACK_IMPORTED_MODULE_1__/* .updateAccountStatus */ .Jg)(account.id, 'error');
                        await (0,_bot_js__WEBPACK_IMPORTED_MODULE_3__/* .sendLog */ .ll)(`❌ **${account.name}**: Failed - Max retries/cycles reached`, 'error');
                        sharedBrowser = result.browser;
                    }

                } else {
                    // ... (Failed logic)
                    console.log(`[Manager] ❌ ${account.name} failed: ${result.reason}`);
                    await (0,_db_js__WEBPACK_IMPORTED_MODULE_1__/* .updateAccountStatus */ .Jg)(account.id, 'error');
                    await (0,_bot_js__WEBPACK_IMPORTED_MODULE_3__/* .sendLog */ .ll)(`❌ **${account.name}**: Failed - ${result.reason}`, 'error');
                    sharedBrowser = result.browser;
                }

            } catch (err) {
                const attempts = (retryCounts.get(account.id) || 0) + 1;
                retryCounts.set(account.id, attempts);

                // Check if we should retry
                if (attempts <= MAX_RETRY_ATTEMPTS) {
                    console.log(`[Manager] ⚠️ Error for ${account.name} (Attempt ${attempts}/${MAX_RETRY_ATTEMPTS}). Retrying...`);
                    await (0,_bot_js__WEBPACK_IMPORTED_MODULE_3__/* .sendLog */ .ll)(`🔄 **${account.name}**: Error (${err.message}) - Retry ${attempts}/3`, 'warning');

                    // Restart browser ONLY if NOT a timeout/login error (as per user request)
                    // If it's a crash or unknown error, we restart. If it's just timeout, we keep browser.
                    const isTimeoutError = err.message === 'IDLE_TIMEOUT' || err.message === 'LOGIN_REQUIRED';

                    if (!isTimeoutError && sharedBrowser) {
                        try { await sharedBrowser.close(); } catch (e) { }
                        sharedBrowser = null;
                        console.log('[Manager] Browser restarted due to critical error.');
                    } else if (isTimeoutError) {
                        console.log('[Manager] Timeout error: Retrying without browser restart.');
                    }

                    // Retry immediately
                    i--;
                    continue;
                }

                // If max retries reached:
                console.error(`[Manager] ❌ ${account.name} failed after 3 attempts:`, err);
                await (0,_db_js__WEBPACK_IMPORTED_MODULE_1__/* .updateAccountStatus */ .Jg)(account.id, 'error');
                await (0,_bot_js__WEBPACK_IMPORTED_MODULE_3__/* .sendLog */ .ll)(`❌ **${account.name}**: Failed - Max retries reached (${err.message})`, 'error');

                // Still close browser to leave clean state for NEXT account
                if (sharedBrowser) {
                    try { await sharedBrowser.close(); } catch (e) { }
                    sharedBrowser = null;
                }
            }

            // Wait between accounts
            if (i < pendingAccounts.length - 1 && !shouldStop) {
                console.log(`[Manager] Waiting ${_config_js__WEBPACK_IMPORTED_MODULE_4__/* .config */ .$.ACCOUNT_DELAY_MS / 1000} seconds before next ID...`);
                await new Promise(r => setTimeout(r, _config_js__WEBPACK_IMPORTED_MODULE_4__/* .config */ .$.ACCOUNT_DELAY_MS));

                // Stop terminal from previous ID and start fresh for next ID
                if (sharedBrowser && sharedBrowser.isLaunched()) {
                    try {
                        console.log('[Manager] Stopping previous terminal process...');
                        await sharedBrowser.clickStop();

                        // CRITICAL: Wait for process to fully terminate
                        console.log('[Manager] Waiting for terminal process to stop...');
                        await new Promise(r => setTimeout(r, 5000)); // 5 seconds for process cleanup

                        console.log('[Manager] Ready for next ID (runner will handle start)...');
                    } catch (e) {
                        console.error('[Manager] Cleanup failed (non-critical):', e.message);
                        // Browser might have died, next account will create new one
                        sharedBrowser = null;
                    }
                }
            }
        }

        // Close browser after all IDs done
        if (sharedBrowser && sharedBrowser.isLaunched()) {
            console.log('[Manager] All IDs processed - closing browser');
            await sharedBrowser.close();
        }

        console.log('[Manager] ✅ Queue processing complete');
        await (0,_bot_js__WEBPACK_IMPORTED_MODULE_3__/* .sendLog */ .ll)('✅ **Queue Complete**: All accounts processed', 'success');

    } catch (err) {
        console.error('[Manager] Queue error:', err);
        await (0,_bot_js__WEBPACK_IMPORTED_MODULE_3__/* .sendLog */ .ll)(`❌ **Queue Error**: ${err.message}`, 'error');

        // Make sure browser is closed on error
        if (sharedBrowser && sharedBrowser.isLaunched()) {
            try {
                await sharedBrowser.close();
            } catch (e) { /* ignore */ }
        }
    } finally {
        isRunning = false;
        shouldStop = false;
    }
};

const runBatch = async (accounts) => {
    // For manual /force_run_all
    return processQueueFull();
};

const executeSession = async (accountId) => {
    // For manual /force_run {name}
    if (isRunning) {
        return { success: false, message: 'Bot is already running a queue' };
    }

    isRunning = true;
    let browser = null;

    try {
        const account = await (0,_db_js__WEBPACK_IMPORTED_MODULE_1__/* .getAccountDecrypted */ .MM)(accountId);
        if (!account) {
            return { success: false, message: 'Account not found' };
        }

        console.log(`[Manager] Running single account: ${account.name}`);
        await (0,_db_js__WEBPACK_IMPORTED_MODULE_1__/* .updateAccountStatus */ .Jg)(account.id, 'running');

        const result = await (0,_runner_js__WEBPACK_IMPORTED_MODULE_2__/* .runSession */ .I)(account, null);
        browser = result.browser;

        if (result.success) {
            await (0,_db_js__WEBPACK_IMPORTED_MODULE_1__/* .updateAccountStatus */ .Jg)(account.id, 'done', new Date().toISOString());
            await (0,_bot_js__WEBPACK_IMPORTED_MODULE_3__/* .sendLog */ .ll)(`✅ **${account.name}**: Session completed successfully`, 'success');
            return { success: true };
        } else {
            await (0,_db_js__WEBPACK_IMPORTED_MODULE_1__/* .updateAccountStatus */ .Jg)(account.id, 'error');
            await (0,_bot_js__WEBPACK_IMPORTED_MODULE_3__/* .sendLog */ .ll)(`❌ **${account.name}**: Failed - ${result.reason}`, 'error');
            return { success: false, message: result.reason };
        }

    } catch (err) {
        console.error('[Manager] Error:', err);
        return { success: false, message: err.message };
    } finally {
        // Close browser for single runs
        if (browser && browser.isLaunched()) {
            try {
                await browser.close();
            } catch (e) { /* ignore */ }
        }
        isRunning = false;
    }
};

// ==== FOUNTAIN EXECUTION FUNCTIONS ====

const executeFountain = async (accountId) => {
    // For manual /fountain {name}
    if (isRunning) {
        return { success: false, message: 'Bot is already running a queue' };
    }

    isRunning = true;
    let browser = null;

    try {
        const account = await getAccountDecrypted(accountId);
        if (!account) {
            return { success: false, message: 'Account not found' };
        }

        console.log(`[Manager] Running fountain for account: ${account.name}`);
        await updateAccountStatus(account.id, 'running');

        // Pass mode: 'fountain' to runSession
        const result = await runSession(account, null, 'fountain');
        browser = result.browser;

        if (result.success) {
            await updateAccountStatus(account.id, 'done', new Date().toISOString());
            await sendLog(`ðŸŒŠ **${account.name}**: Fountain collected successfully`, 'success');
            return { success: true };
        } else {
            await updateAccountStatus(account.id, 'error');
            await sendLog(`âŒ **${account.name}**: Fountain failed - ${result.reason}`, 'error');
            return { success: false, message: result.reason };
        }

    } catch (err) {
        console.error('[Manager] Fountain error:', err);
        return { success: false, message: err.message };
    } finally {
        // Close browser for single runs
        if (browser && browser.isLaunched()) {
            try {
                await browser.close();
            } catch (e) { /* ignore */ }
        }
        isRunning = false;
    }
};

const runFountainBatch = async () => {
    // For /fountain_all command
    if (isRunning) {
        return { success: false, message: 'Bot is already running' };
    }

    const release = await lock.acquire();
    isRunning = true;

    let completedCount = 0;
    let sharedBrowser = null;

    try {
        const accounts = await getAccounts();
        if (accounts.length === 0) {
            console.log('[Manager] No accounts to process');
            isRunning = false;
            release();
            return { completed: 0 };
        }

        console.log(`[Manager] Starting fountain batch for ${accounts.length} accounts`);
        await sendLog(`ðŸŒŠ **Fountain Batch Started**: Processing ${accounts.length} accounts`, 'info');

        for (let i = 0; i < accounts.length; i++) {
            if (shouldStop) {
                console.log('[Manager] ðŸ›‘ Kill-switch activated - stopping fountain batch');
                await sendLog('ðŸ›‘ **Fountain Batch Stopped**: Force stop activated', 'error');
                break;
            }

            const account = accounts[i];
            try {
                console.log(`\n[Manager] [${i + 1}/${accounts.length}] Fountain for ${account.name}...`);
                await updateAccountStatus(account.id, 'running');

                // Run fountain session with shared browser and mode
                const result = await runSession(await getAccountDecrypted(account.id), sharedBrowser, 'fountain');

                // Update shared browser reference
                if (result.createdBrowser) {
                    sharedBrowser = result.browser;
                }

                if (result.success) {
                    console.log(`[Manager] âœ… Fountain completed for ${account.name}`);
                    await updateAccountStatus(account.id, 'done', new Date().toISOString());
                    completedCount++;
                } else {
                    console.log(`[Manager] âŒ Fountain failed for ${account.name}: ${result.reason}`);
                    await updateAccountStatus(account.id, 'error');
                }

            } catch (err) {
                console.error(`[Manager] Error processing fountain for ${account.name}:`, err);
                await updateAccountStatus(account.id, 'error');
            }
        }

        await sendLog(`âœ… **Fountain Batch Complete**: Processed ${completedCount}/${accounts.length} accounts`, 'success');
        return { completed: completedCount };

    } catch (err) {
        console.error('[Manager] Fountain batch error:', err);
        throw err;
    } finally {
        // Close shared browser if created
        if (sharedBrowser && sharedBrowser.isLaunched()) {
            try {
                await sharedBrowser.close();
            } catch (e) {
                console.error('[Manager] Error closing shared browser:', e);
            }
        }
        isRunning = false;
        release();
    }
};

__webpack_async_result__();
} catch(e) { __webpack_async_result__(e); } });

/***/ }),

/***/ 15:
/***/ (function(module, __webpack_exports__, __nccwpck_require__) {

"use strict";
__nccwpck_require__.a(module, async (__webpack_handle_async_dependencies__, __webpack_async_result__) => { try {
/* harmony export */ __nccwpck_require__.d(__webpack_exports__, {
/* harmony export */   I: () => (/* binding */ runSession)
/* harmony export */ });
/* harmony import */ var _brain_js__WEBPACK_IMPORTED_MODULE_0__ = __nccwpck_require__(717);
/* harmony import */ var _bot_js__WEBPACK_IMPORTED_MODULE_1__ = __nccwpck_require__(988);
/* harmony import */ var _browser_controller_js__WEBPACK_IMPORTED_MODULE_2__ = __nccwpck_require__(714);
/* harmony import */ var _websocket_client_js__WEBPACK_IMPORTED_MODULE_3__ = __nccwpck_require__(766);
/* harmony import */ var _config_js__WEBPACK_IMPORTED_MODULE_4__ = __nccwpck_require__(847);
var __webpack_async_dependencies__ = __webpack_handle_async_dependencies__([_bot_js__WEBPACK_IMPORTED_MODULE_1__]);
_bot_js__WEBPACK_IMPORTED_MODULE_1__ = (__webpack_async_dependencies__.then ? (await __webpack_async_dependencies__)() : __webpack_async_dependencies__)[0];






// Helper to clean HTML but PRESERVE structure for server selection
const stripHTML = (html) => {
    return html
        .replace(/<br\s*\/?>/gi, '\n') // Convert <br> to newline
        .replace(/<\/div>/gi, '\n')    // Convert </div> to newline
        .replace(/<\/p>/gi, '\n')      // Convert </p> to newline
        .replace(/<[^>]*>/g, '')       // Strip remaining tags
        .trim();
};

const runSession = async (account, sharedBrowser = null) => {
    let browser = sharedBrowser; // Reuse if provided
    const createdBrowser = !sharedBrowser; // Track if we created it

    try {
        console.log('\n' + '='.repeat(60));
        console.log(`🤖 [Runner] Starting HYBRID session for "${account.name}"`);
        console.log('='.repeat(60));

        // Get session cookie
        const { getCookies } = await Promise.resolve(/* import() */).then(__nccwpck_require__.bind(__nccwpck_require__, 467));
        const cookies = await getCookies();
        if (!cookies) {
            throw new Error('No session cookie configured. Use /set_cookies command.');
        }

        // 1. Initial Cleanup & Setup
        let terminalBuffer = '';
        let currentUsers = 0;
        let maxUsers = 4;
        let brain = null;
        let wsClient = null;

        // 2. Start Rust brain FIRST (so it's ready)
        console.log('[Runner] Initializing Rust brain...');
        brain = new _brain_js__WEBPACK_IMPORTED_MODULE_0__/* .RustBrain */ .D();
        await brain.start();
        console.log('🧠 [Runner] Rust brain initialized');

        // 3. Launch/Check Browser
        if (!browser) {
            browser = new _browser_controller_js__WEBPACK_IMPORTED_MODULE_2__/* .BrowserController */ .f();
            await browser.launch(cookies);

            // Check if login required - ensure cleanup on failure
            try {
                if (await browser.isLoginRequired()) {
                    throw new Error('LOGIN_REQUIRED - Cookie expired or invalid');
                }
            } catch (err) {
                // Cleanup WebSocket if it was created
                if (wsClient) {
                    try { wsClient.close(); } catch (e) { }
                }
                throw err; // Re-throw after cleanup
            }
        }

        // 4. Connect WebSocket (Connect BEFORE clicking Start)
        console.log('[Runner] Connecting WebSocket...');

        // --- Polling Loop for Connection (Retry if Terminal Full) ---
        const CONNECT_TIMEOUT = _config_js__WEBPACK_IMPORTED_MODULE_4__/* .config */ .$.CONNECT_TIMEOUT_MS;
        const startConnect = Date.now();
        let connected = false;
        let retryCount = 0;
        const MAX_RETRIES = 20; // Limit total retries

        while (!connected && (Date.now() - startConnect < CONNECT_TIMEOUT) && retryCount < MAX_RETRIES) {
            try {
                // Create new client instance if needed (clean state)
                if (wsClient) {
                    try { wsClient.close(); } catch (e) { }
                }
                wsClient = new _websocket_client_js__WEBPACK_IMPORTED_MODULE_3__/* .EvertextWebSocketClient */ .a(cookies);

                // Re-attach listeners every attempt
                wsClient.on('output', (data) => terminalBuffer += data);
                wsClient.on('user_count', (data) => {
                    currentUsers = data.current_users;
                    maxUsers = data.max_users;
                });
                // Error listener for logging (logic handled in catch)
                wsClient.on('error', (err) => {
                    if (err.message !== 'CONNECTION_FAILED') {
                        console.error('[Runner] WebSocket error:', err.message);
                    }
                });

                await wsClient.connect();
                connected = true;
                console.log('[Runner] WebSocket connected');

            } catch (err) {
                retryCount++;
                if (err.message === 'CONNECTION_FAILED') {
                    // Exponential backoff: 5s, 10s, 20s, 40s, 60s (max)
                    const backoffDelay = Math.min(5000 * Math.pow(2, retryCount - 1), 60000);
                    const remainingTime = Math.floor((CONNECT_TIMEOUT - (Date.now() - startConnect)) / 1000);
                    console.log(`⚠️ [Runner] Connection rejected (Terminal Full). Retry ${retryCount}/${MAX_RETRIES} in ${backoffDelay / 1000}s (${remainingTime}s remaining)`);
                    await (0,_bot_js__WEBPACK_IMPORTED_MODULE_1__/* .sendLog */ .ll)(`⏸️ **${account.name}**: Terminal full - Retry ${retryCount}/${MAX_RETRIES} in ${backoffDelay / 1000}s`, 'info');
                    await new Promise(r => setTimeout(r, backoffDelay));
                } else {
                    // Start retry logic for other connection errors too, but logging differently
                    console.error('[Runner] Connection failed:', err.message);
                    throw err; // For now, throw on non-capacity errors
                }
            }
        }

        if (!connected) {
            throw new Error('Terminal full - Timed out after 10 minutes');
        }
        // -----------------------------------------------------------
        console.log('[Runner] WebSocket connected');

        // 5. Check if terminal is full BEFORE clicking Start
        if (currentUsers >= maxUsers) {
            console.log(`⚠️ [Runner] Terminal is FULL (${currentUsers}/${maxUsers}). Waiting for slot...`);
            await (0,_bot_js__WEBPACK_IMPORTED_MODULE_1__/* .sendLog */ .ll)(`⏸️ **${account.name}**: Terminal full - waiting for slot`, 'info');

            // Wait for a slot to open (event-driven)
            let checkInterval = null; // Track interval for cleanup
            const slotOpened = await new Promise((resolve) => {
                const MAX_WAIT_TIME = _config_js__WEBPACK_IMPORTED_MODULE_4__/* .config */ .$.MAX_WAIT_TIME_MS;
                const startWait = Date.now();

                checkInterval = setInterval(() => {
                    if (currentUsers < maxUsers) {
                        console.log(`✅ [Runner] Slot opened! (${currentUsers}/${maxUsers})`);
                        clearInterval(checkInterval);
                        checkInterval = null;
                        resolve(true);
                    } else if (Date.now() - startWait > MAX_WAIT_TIME) {
                        console.log(`⏱️ [Runner] Max wait time (10 min) reached. Deferring...`);
                        clearInterval(checkInterval);
                        checkInterval = null;
                        resolve(false);
                    }
                }, _config_js__WEBPACK_IMPORTED_MODULE_4__/* .config */ .$.SLOT_CHECK_INTERVAL_MS);

                // Cleanup interval if WebSocket disconnects
                const cleanupInterval = () => {
                    if (checkInterval) {
                        clearInterval(checkInterval);
                        checkInterval = null;
                        resolve(false);
                    }
                };

                wsClient.once('disconnect', cleanupInterval);
                wsClient.once('error', cleanupInterval);
            });

            if (!slotOpened) {
                await (0,_bot_js__WEBPACK_IMPORTED_MODULE_1__/* .sendLog */ .ll)(`⏭️ **${account.name}**: Terminal full after 10 min - deferring`, 'info');
                if (wsClient) wsClient.close();
                if (brain) brain.stop();
                return { success: false, reason: 'Terminal full', defer: true, browser, createdBrowser };
            }

            await (0,_bot_js__WEBPACK_IMPORTED_MODULE_1__/* .sendLog */ .ll)(`✅ **${account.name}**: Slot opened - proceeding!`, 'success');
        }

        // 6. Click Start Button (Puppeteer) - Start terminal only when ready
        console.log('[Runner] Starting terminal via browser...');
        await browser.clickStart();

        console.log('✅ [Runner] Hybrid setup complete (Brain -> WebSocket -> Browser Start)\n');

        // Wait for initial terminal output to arrive via WebSocket
        console.log('[Runner] Waiting for initial terminal data...');
        await new Promise(r => setTimeout(r, 2000));

        if (terminalBuffer.length === 0) {
            console.log('⚠️ [Runner] No terminal output received. WebSocket might not be working.');
            console.log('⚠️ [Runner] Waiting 3 more seconds...');
            await new Promise(r => setTimeout(r, 3000));
            console.log(`⚠️ [Runner] Buffer after extra wait: ${terminalBuffer.length} chars`);

            // --- RECONNECTION FIX FOR EMPTY BUFFER ---
            if (terminalBuffer.length === 0) {
                console.log('🔄 [Runner] Buffer STILL empty. Connection stale. Reconnecting WebSocket...');

                if (wsClient) {
                    try { wsClient.close(); } catch (e) { }
                }

                wsClient = new _websocket_client_js__WEBPACK_IMPORTED_MODULE_3__/* .EvertextWebSocketClient */ .a(cookies);

                // Re-attach listeners
                wsClient.on('output', (data) => {
                    terminalBuffer += data;
                    // Log first chunk only to avoid spam
                    if (terminalBuffer.length < 500) console.log(`[WebSocket] 📥 Re-connected data: ${data.length} chars`);
                });

                wsClient.on('user_count', (data) => {
                    currentUsers = data.current_users;
                    maxUsers = data.max_users;
                });

                wsClient.on('error', (err) => {
                    console.error('[Runner] WebSocket error (Reconnected):', err.message);
                });

                console.log('[Runner] Re-connecting...');
                await wsClient.connect();
                console.log('[Runner] Re-connected! Waiting 2s for data...');
                await new Promise(r => setTimeout(r, _config_js__WEBPACK_IMPORTED_MODULE_4__/* .config */ .$.BROWSER_RECONNECT_WAIT_MS));
            }
            // -----------------------------------------
        } else {
            console.log(`✅ [Runner] Received ${terminalBuffer.length} chars of initial data`);
            console.log(`📊 [Runner] First 150 chars: ${terminalBuffer.substring(0, 150)}`);
        }

        // 6. Main loop starts...

        // 5. Main loop - Process terminal output with brain
        const startTime = Date.now();
        const MAX_SESSION_TIME = _config_js__WEBPACK_IMPORTED_MODULE_4__/* .config */ .$.MAX_SESSION_TIME_MS;
        const IDLE_TIMEOUT_MS = _config_js__WEBPACK_IMPORTED_MODULE_4__/* .config */ .$.IDLE_TIMEOUT_MS;
        let lastProcessedLength = 0;
        let lastDataTime = Date.now();

        console.log('🧠 [Runner] Entering brain-controlled loop...\n');

        while (Date.now() - startTime < MAX_SESSION_TIME) {
            // Check Idle Timeout
            if (Date.now() - lastDataTime > IDLE_TIMEOUT_MS) {
                console.error(`⏱️ [Runner] Idle timeout (${IDLE_TIMEOUT_MS}ms) - No new data.`);
                throw new Error('IDLE_TIMEOUT');
            }

            // Extract new text from buffer
            let newText = '';
            if (terminalBuffer.length > lastProcessedLength) {
                newText = terminalBuffer.slice(lastProcessedLength);
                lastProcessedLength = terminalBuffer.length;
                lastDataTime = Date.now(); // Reset idle timer on new data
            }

            // --- HTML Stripping Fix ---
            let cleanText = stripHTML(newText);
            // ---------------------------

            // --- Context Injection for Server Selection ---
            // If we see the login prompt, inject last 1600 chars so brain sees the server list
            if (cleanText.includes('Which acc u want to Login')) {
                console.log('[Runner] 🛠️ Login prompt detected. Injecting context history...');
                const fullClean = stripHTML(terminalBuffer);
                // Increased buffer to ensure we capture full server list
                const startIdx = Math.max(0, fullClean.length - _config_js__WEBPACK_IMPORTED_MODULE_4__/* .config */ .$.SERVER_LIST_CONTEXT_CHARS);
                cleanText = fullClean.slice(startIdx);

                // DEBUG: Show what brain will receive
                console.log('[Runner] 🔍 DEBUG - Sending to brain for server selection (Last 5000 chars):');
                console.log('--- START OF TEXT ---');
                console.log(cleanText);
                console.log('--- END OF TEXT ---');
                console.log(`[Runner] Target server: ${account.targetServer}`);
            }
            // ----------------------------------------------

            // Send to brain
            const response = await brain.processTerminalOutput(cleanText, {
                name: account.name,
                code: account.code,
                targetServer: account.targetServer.trim(), // Trim to handle accidental spaces
                serverToggle: account.serverToggle // Pass the toggle
            });

            console.log(`[Brain Decision] Action: ${response.action}`);

            // Execute brain's command
            if (response.action === 'send_text') {
                console.log(`[Runner] Sending: "${response.payload}"`);
                await wsClient.sendCommand(response.payload);

                // Enhanced logging
                if (response.payload === 'auto') {
                } else if (response.payload === 'd') {
                } else if (terminalBuffer.includes('Enter Restore code') && response.payload.length > 5) {
                } else if (response.payload === 'y' && terminalBuffer.includes('spend mana')) {
                } else if (response.payload === '3' && terminalBuffer.includes('select potion')) {
                }

                if (terminalBuffer.includes('Which acc u want to Login') && !response.payload.match(/[a-z]/i)) {
                } else if (response.action === 'send_text' && response.context === 'server_selection') {
                    // Parse terminal to extract server info
                    const lines = terminalBuffer.split('\n');
                    let serverInfo = null;

                    // Find the selected server line
                    for (const line of lines) {
                        // Match pattern: "1--> Server-Shard: 175 (E-15) || Account-Name: Cat Man || Guild: Night Raid"
                        const match = line.match(/^\s*(\d+)-->\s*Server-Shard:\s*(\d+)\s*\(([^)]+)\)\s*\|\|\s*Account-Name:\s*([^|]+)\s*\|\|\s*Guild:\s*(.+)$/);
                        if (match && match[1] === response.payload) {
                            serverInfo = {
                                index: match[1],
                                shard: match[2],
                                server: match[3],
                                accountName: match[4].trim(),
                                guild: match[5].trim()
                            };
                            break;
                        }
                    }

                    if (serverInfo) {
                        await (0,_bot_js__WEBPACK_IMPORTED_MODULE_1__/* .sendLog */ .ll)(
                            `🚀 **${account.name}** starting\n` +
                            `📍 Server-Shard: ${serverInfo.shard} (${serverInfo.server}) || Account: ${serverInfo.accountName} || Guild: ${serverInfo.guild}`,
                            'info'
                        );
                    } else {
                        // Fallback if parsing fails
                        await (0,_bot_js__WEBPACK_IMPORTED_MODULE_1__/* .sendLog */ .ll)(`🚀 **${account.name}**: Starting session (Server index: ${response.payload})`, 'info');
                    }
                }

            } else if (response.action === 'close_terminal') {
                console.log(`[Runner] Session complete: ${response.reason}`);

                // Stop terminal via Puppeteer (but don't close browser)
                if (browser && browser.isLaunched()) {
                    await browser.clickStop();
                }

                // Clean up WebSocket and brain
                if (wsClient) wsClient.close();
                if (brain) brain.stop();

                console.log('='.repeat(60) + '\n');
                return { success: true, browser, createdBrowser };

            } else if (response.action === 'restart_terminal') {
                console.log(`[Runner] Restart requested: ${response.reason}`);

                // Stop terminal
                if (browser && browser.isLaunched()) {
                    await browser.clickStop();
                    await new Promise(r => setTimeout(r, 2000));
                }

                // Close old WebSocket completely
                if (wsClient) {
                    wsClient.close();
                    wsClient = null;
                }

                // Reset brain state
                await brain.sendMessage({ type: 'init' });

                // Restart terminal
                if (browser && browser.isLaunched()) {
                    await browser.clickStart();
                }

                // Create new WebSocket
                terminalBuffer = '';
                lastProcessedLength = 0;

                wsClient = new _websocket_client_js__WEBPACK_IMPORTED_MODULE_3__/* .EvertextWebSocketClient */ .a(cookies);
                wsClient.on('output', (data) => {
                    terminalBuffer += data;
                });
                wsClient.on('error', (err) => {
                    console.error('[Runner] WebSocket error:', err.message);
                });
                await wsClient.connect();

                console.log('[Runner] Terminal restarted, continuing...');
                continue;

            } else if (response.action === 'defer_account') {
                console.log(`[Runner] Deferring account: ${response.reason}`);

                if (browser && browser.isLaunched()) {
                    await browser.clickStop();
                }
                if (wsClient) wsClient.close();
                if (brain) brain.stop();

                console.log('='.repeat(60) + '\n');
                return { success: false, reason: response.reason, defer: true, browser, createdBrowser };

            } else if (response.action === 'wait') {
                // Brain is waiting - continue loop
                await new Promise(r => setTimeout(r, 1500));
            }
        }

        // Timeout
        console.log('⚠️ Session timed out (15 minutes)');
        if (browser && browser.isLaunched()) await browser.clickStop();
        if (wsClient) wsClient.close();
        if (brain) brain.stop();
        console.log('='.repeat(60) + '\n');
        return { success: false, reason: 'Session timeout', browser, createdBrowser };

    } catch (error) {
        console.log('\n❌ ERROR OCCURRED');
        console.log('💥 Error:', error.message);
        console.log('='.repeat(60) + '\n');

        // Clean up carefully
        try {
            if (wsClient) wsClient.close();
        } catch (e) { /* ignore */ }

        try {
            if (brain) brain.stop();
        } catch (e) { /* ignore */ }

        try {
            if (browser && browser.isLaunched()) await browser.clickStop();
        } catch (e) { /* ignore */ }

        return { success: false, reason: error.message, browser, createdBrowser };
    }
};

__webpack_async_result__();
} catch(e) { __webpack_async_result__(e); } });

/***/ }),

/***/ 32:
/***/ (function(__unused_webpack_module, __webpack_exports__, __nccwpck_require__) {

"use strict";

// EXPORTS
__nccwpck_require__.d(__webpack_exports__, {
  x: () => (/* binding */ runSetup)
});

// EXTERNAL MODULE: external "fs/promises"
var promises_ = __nccwpck_require__(943);
var promises_default = /*#__PURE__*/__nccwpck_require__.n(promises_);
// EXTERNAL MODULE: external "path"
var external_path_ = __nccwpck_require__(928);
;// CONCATENATED MODULE: external "readline"
const external_readline_namespaceObject = __WEBPACK_EXTERNAL_createRequire(import.meta.url)("readline");
var external_readline_default = /*#__PURE__*/__nccwpck_require__.n(external_readline_namespaceObject);
;// CONCATENATED MODULE: ./src/setup.js




const ENV_PATH = __nccwpck_require__.ab + ".env";

async function runSetup() {
    console.log('[Setup] Checking configuration...');

    let currentEnv = {};
    try {
        const envContent = await promises_default().readFile(__nccwpck_require__.ab + ".env", 'utf-8');
        envContent.split('\n').forEach(line => {
            const [key, ...val] = line.split('=');
            if (key && val) currentEnv[key.trim()] = val.join('=').trim();
        });
    } catch (e) {
        // File doesn't exist, ignore
    }

    if (currentEnv.DISCORD_TOKEN) {
        console.log('[Setup] ✅ Configuration found. Starting bot...');
        return;
    }

    console.log('\n==================================================');
    console.log('         EVERTEXT BOT FIRST-TIME SETUP');
    console.log('==================================================\n');

    const rl = external_readline_default().createInterface({
        input: process.stdin,
        output: process.stdout
    });

    const ask = (query) => new Promise(resolve => rl.question(query, resolve));

    try {
        console.log('Please enter your credentials.\n');

        let token = '';
        while (!token) {
            token = await ask('Enter DISCORD_TOKEN (Required): ');
            if (!token.trim()) console.log('❌ Token is required!');
        }

        const encryptionKey = await ask('Enter ENCRYPTION_KEY (Optional, press Enter to skip): ');

        let newEnvContent = '';
        // Preserve existing env vars if any (though likely empty if we are here)
        // Actually best to just write what we need to avoid complexity with partial files
        // But we should respect other vars if they existed but token was missing?
        // Let's just append or create.

        let envLines = [];
        try {
            const existingFile = await promises_default().readFile(__nccwpck_require__.ab + ".env", 'utf-8');
            envLines = existingFile.split('\n');
        } catch (e) { }

        const updateOrAdd = (key, value) => {
            const index = envLines.findIndex(line => line.startsWith(`${key}=`));
            if (index !== -1) {
                envLines[index] = `${key}=${value}`;
            } else {
                envLines.push(`${key}=${value}`);
            }
        };

        updateOrAdd('DISCORD_TOKEN', token.trim());
        if (encryptionKey.trim()) {
            updateOrAdd('ENCRYPTION_KEY', encryptionKey.trim());
        }

        await promises_default().writeFile(__nccwpck_require__.ab + ".env", envLines.join('\n').trim() + '\n');
        console.log('\n[Setup] ✅ Configuration saved to .env\n');

    } catch (err) {
        console.error('[Setup] Error saving configuration:', err);
    } finally {
        rl.close();
    }
}


/***/ }),

/***/ 766:
/***/ (function(__unused_webpack_module, __webpack_exports__, __nccwpck_require__) {

"use strict";

// EXPORTS
__nccwpck_require__.d(__webpack_exports__, {
  a: () => (/* binding */ EvertextWebSocketClient)
});

// EXTERNAL MODULE: ../../../AppData/Local/npm-cache/_npx/7a71fb44c9115061/node_modules/@vercel/ncc/dist/ncc/@@notfound.js?ws
var _notfoundws = __nccwpck_require__(605);
var _notfoundws_default = /*#__PURE__*/__nccwpck_require__.n(_notfoundws);
;// CONCATENATED MODULE: external "events"
const external_events_namespaceObject = __WEBPACK_EXTERNAL_createRequire(import.meta.url)("events");
;// CONCATENATED MODULE: ./src/websocket-client.js



const BASE_URL = 'wss://evertext.sytes.net/socket.io/?EIO=4&transport=websocket';

class EvertextWebSocketClient extends external_events_namespaceObject.EventEmitter {
    constructor(sessionCookie) {
        super();
        this.sessionCookie = sessionCookie;
        this.ws = null;
        this.sid = null;
        this.pingInterval = null;
        this.connected = false;
        this.lastActivity = Date.now();
        this.activityCheckInterval = null;
    }

    async connect() {
        return new Promise((resolve, reject) => {
            const headers = {
                'Cookie': `session=${this.sessionCookie}`,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Origin': 'https://evertext.sytes.net',
                'Host': 'evertext.sytes.net'
            };

            console.log('[WebSocket] Connecting to EverText terminal...');

            this.ws = new (_notfoundws_default())(BASE_URL, { headers });

            const timeout = setTimeout(() => {
                reject(new Error('Connection timeout (15s)'));
                this.ws?.close();
            }, 15000);

            this.ws.on('open', () => {
                console.log('[WebSocket] Connection opened, waiting for handshake...');
            });

            this.ws.on('message', (data) => {
                clearTimeout(timeout);
                const message = data.toString();
                this.lastActivity = Date.now(); // Track activity for heartbeat

                // Handle Socket.IO protocol messages
                if (message.startsWith('0')) {
                    // Open packet with session info
                    try {
                        const json = JSON.parse(message.substring(1));
                        this.sid = json.sid;
                        this.pingInterval = json.pingInterval || 25000;
                        console.log(`[WebSocket] Connected! Session ID: ${this.sid}`);

                        // Send namespace upgrade
                        this.ws.send('40');
                        this.connected = true;

                        // Start ping interval
                        this._startPing();

                        resolve();
                    } catch (e) {
                        reject(new Error('Failed to parse handshake: ' + e.message));
                    }
                } else if (message === '2') {
                    // Server ping - respond with pong
                    if (this.ws) {
                        this.ws.send('3');
                    }
                } else if (message.startsWith('40')) {
                    // Namespace connected
                    console.log('[WebSocket] Namespace connected. Ready for events.');
                } else if (message.startsWith('42')) {
                    // Event packet
                    this._handleEvent(message);
                }
            });

            this.ws.on('error', (err) => {
                clearTimeout(timeout);
                console.error('[WebSocket] Error:', err.message);
                reject(err);
            });

            this.ws.on('close', () => {
                console.log('[WebSocket] Connection closed');
                this.connected = false;
                this._stopPing();
                this.emit('disconnect');
            });
        });
    }

    _startPing() {
        // Send periodic pings to keep connection alive
        this._pingTimer = setInterval(() => {
            if (this.connected && this.ws?.readyState === (_notfoundws_default()).OPEN) {
                this.ws.send('2');
            }
        }, Math.floor(this.pingInterval * 0.8)); // Ping before server expects it

        // Start activity checker (Issue #30 fix)
        this.activityCheckInterval = setInterval(() => {
            const timeSinceActivity = Date.now() - this.lastActivity;
            if (timeSinceActivity > 120000) { // 2 minutes of silence
                console.warn('[WebSocket] No activity for 2 minutes - connection may be dead');
                this.emit('error', new Error('CONNECTION_TIMEOUT'));
                this.close();
            }
        }, 30000); // Check every 30 seconds
    }

    _stopPing() {
        if (this._pingTimer) {
            clearInterval(this._pingTimer);
            this._pingTimer = null;
        }
        if (this.activityCheckInterval) {
            clearInterval(this.activityCheckInterval);
            this.activityCheckInterval = null;
        }
    }

    _handleEvent(message) {
        try {
            const eventData = JSON.parse(message.substring(2));
            const [eventName, payload] = eventData;

            if (eventName === 'output') {
                // Terminal output event
                this.emit('output', payload.data);
            } else if (eventName === 'idle_timeout') {
                console.log('[WebSocket] Server sent idle_timeout');
                this.emit('error', new Error('IDLE_TIMEOUT'));
            } else if (eventName === 'connection_failed') {
                console.log('[WebSocket] Server sent connection_failed');
                this.emit('error', new Error('CONNECTION_FAILED'));
            } else if (eventName === 'disconnect') {
                console.log('[WebSocket] Server sent disconnect event');
                this.emit('disconnect');
            } else if (eventName === 'user_count_update') {
                // User count event - validate and emit for runner to check
                if (payload && typeof payload.current_users === 'number' && typeof payload.max_users === 'number') {
                    this.emit('user_count', payload);
                    console.log(`[WebSocket] User count: ${payload.current_users}/${payload.max_users}`);
                } else {
                    console.warn('[WebSocket] Invalid user_count_update payload:', payload);
                }
            } else if (eventName === 'activity_ping') {
                // Harmless heartbeat - ignore silently
                return;
            } else {
                // Unknown event - log for debugging
                console.log(`[WebSocket] Unknown event: ${eventName}`);
            }
        } catch (e) {
            console.error('[WebSocket] Failed to parse event:', e.message);
        }
    }

    async sendCommand(command) {
        console.log(`[WebSocket] 📤 Attempting to send command: "${command}"`);

        if (!this.ws) {
            console.error('[WebSocket] ❌ WebSocket object is null');
            throw new Error('WebSocket not initialized');
        }

        const state = this.ws.readyState;
        const stateNames = ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'];
        console.log(`[WebSocket] Connection state: ${stateNames[state]} (${state})`);

        if (!this.connected || state !== (_notfoundws_default()).OPEN) {
            console.error(`[WebSocket] ❌ Cannot send - not connected (state: ${stateNames[state]})`);
            throw new Error('WebSocket not connected');
        }

        const payload = JSON.stringify(['input', { input: command }]);
        console.log(`[WebSocket] 📡 Sending payload: ${payload}`);

        try {
            this.ws.send('42' + payload);
            console.log(`[WebSocket] ✅ Command sent successfully`);
        } catch (err) {
            console.error(`[WebSocket] ❌ Failed to send:`, err.message);
            throw err;
        }

        // Small delay to prevent flooding
        await new Promise(r => setTimeout(r, 300));
    }

    async startTerminal() {
        if (!this.connected) {
            throw new Error('Must connect before starting terminal');
        }

        console.log('[WebSocket] Sending stop event (cleanup)...');
        const stopPayload = JSON.stringify(['stop', {}]);
        this.ws.send('42' + stopPayload);

        await new Promise(r => setTimeout(r, 500));

        console.log('[WebSocket] Sending start event...');
        const startPayload = JSON.stringify(['start', { args: '' }]);
        this.ws.send('42' + startPayload);
    }

    close() {
        console.log('[WebSocket] Closing connection...');
        this._stopPing();
        this.connected = false;
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }
}


/***/ }),

/***/ 516:
/***/ (function(module) {

module.exports = eval("require")("crypto-js");


/***/ }),

/***/ 296:
/***/ (function(module) {

module.exports = eval("require")("discord.js");


/***/ }),

/***/ 285:
/***/ (function(module) {

module.exports = eval("require")("dotenv");


/***/ }),

/***/ 92:
/***/ (function(module) {

module.exports = eval("require")("lowdb/node");


/***/ }),

/***/ 380:
/***/ (function(module) {

module.exports = eval("require")("node-cron");


/***/ }),

/***/ 659:
/***/ (function(module) {

module.exports = eval("require")("puppeteer");


/***/ }),

/***/ 605:
/***/ (function(module) {

module.exports = eval("require")("ws");


/***/ }),

/***/ 317:
/***/ (function(module) {

"use strict";
module.exports = __WEBPACK_EXTERNAL_createRequire(import.meta.url)("child_process");

/***/ }),

/***/ 943:
/***/ (function(module) {

"use strict";
module.exports = __WEBPACK_EXTERNAL_createRequire(import.meta.url)("fs/promises");

/***/ }),

/***/ 928:
/***/ (function(module) {

"use strict";
module.exports = __WEBPACK_EXTERNAL_createRequire(import.meta.url)("path");

/***/ }),

/***/ 23:
/***/ (function(module) {

"use strict";
module.exports = __WEBPACK_EXTERNAL_createRequire(import.meta.url)("util");

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __nccwpck_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		var threw = true;
/******/ 		try {
/******/ 			__webpack_modules__[moduleId](module, module.exports, __nccwpck_require__);
/******/ 			threw = false;
/******/ 		} finally {
/******/ 			if(threw) delete __webpack_module_cache__[moduleId];
/******/ 		}
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/async module */
/******/ 	!function() {
/******/ 		var webpackQueues = typeof Symbol === "function" ? Symbol("webpack queues") : "__webpack_queues__";
/******/ 		var webpackExports = typeof Symbol === "function" ? Symbol("webpack exports") : "__webpack_exports__";
/******/ 		var webpackError = typeof Symbol === "function" ? Symbol("webpack error") : "__webpack_error__";
/******/ 		var resolveQueue = function(queue) {
/******/ 			if(queue && queue.d < 1) {
/******/ 				queue.d = 1;
/******/ 				queue.forEach(function(fn) { fn.r--; });
/******/ 				queue.forEach(function(fn) { fn.r-- ? fn.r++ : fn(); });
/******/ 			}
/******/ 		}
/******/ 		var wrapDeps = function(deps) { return deps.map(function(dep) {
/******/ 			if(dep !== null && typeof dep === "object") {
/******/ 				if(dep[webpackQueues]) return dep;
/******/ 				if(dep.then) {
/******/ 					var queue = [];
/******/ 					queue.d = 0;
/******/ 					dep.then(function(r) {
/******/ 						obj[webpackExports] = r;
/******/ 						resolveQueue(queue);
/******/ 					}, function(e) {
/******/ 						obj[webpackError] = e;
/******/ 						resolveQueue(queue);
/******/ 					});
/******/ 					var obj = {};
/******/ 					obj[webpackQueues] = function(fn) { fn(queue); };
/******/ 					return obj;
/******/ 				}
/******/ 			}
/******/ 			var ret = {};
/******/ 			ret[webpackQueues] = function() {};
/******/ 			ret[webpackExports] = dep;
/******/ 			return ret;
/******/ 		}); };
/******/ 		__nccwpck_require__.a = function(module, body, hasAwait) {
/******/ 			var queue;
/******/ 			hasAwait && ((queue = []).d = -1);
/******/ 			var depQueues = new Set();
/******/ 			var exports = module.exports;
/******/ 			var currentDeps;
/******/ 			var outerResolve;
/******/ 			var reject;
/******/ 			var promise = new Promise(function(resolve, rej) {
/******/ 				reject = rej;
/******/ 				outerResolve = resolve;
/******/ 			});
/******/ 			promise[webpackExports] = exports;
/******/ 			promise[webpackQueues] = function(fn) { queue && fn(queue), depQueues.forEach(fn), promise["catch"](function() {}); };
/******/ 			module.exports = promise;
/******/ 			body(function(deps) {
/******/ 				currentDeps = wrapDeps(deps);
/******/ 				var fn;
/******/ 				var getResult = function() { return currentDeps.map(function(d) {
/******/ 					if(d[webpackError]) throw d[webpackError];
/******/ 					return d[webpackExports];
/******/ 				}); }
/******/ 				var promise = new Promise(function(resolve) {
/******/ 					fn = function() { resolve(getResult); };
/******/ 					fn.r = 0;
/******/ 					var fnQueue = function(q) { q !== queue && !depQueues.has(q) && (depQueues.add(q), q && !q.d && (fn.r++, q.push(fn))); };
/******/ 					currentDeps.map(function(dep) { dep[webpackQueues](fnQueue); });
/******/ 				});
/******/ 				return fn.r ? promise : getResult();
/******/ 			}, function(err) { (err ? reject(promise[webpackError] = err) : outerResolve(exports)), resolveQueue(queue); });
/******/ 			queue && queue.d < 0 && (queue.d = 0);
/******/ 		};
/******/ 	}();
/******/ 	
/******/ 	/* webpack/runtime/compat get default export */
/******/ 	!function() {
/******/ 		// getDefaultExport function for compatibility with non-harmony modules
/******/ 		__nccwpck_require__.n = function(module) {
/******/ 			var getter = module && module.__esModule ?
/******/ 				function() { return module['default']; } :
/******/ 				function() { return module; };
/******/ 			__nccwpck_require__.d(getter, { a: getter });
/******/ 			return getter;
/******/ 		};
/******/ 	}();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	!function() {
/******/ 		// define getter functions for harmony exports
/******/ 		__nccwpck_require__.d = function(exports, definition) {
/******/ 			for(var key in definition) {
/******/ 				if(__nccwpck_require__.o(definition, key) && !__nccwpck_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	}();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	!function() {
/******/ 		__nccwpck_require__.o = function(obj, prop) { return Object.prototype.hasOwnProperty.call(obj, prop); }
/******/ 	}();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	!function() {
/******/ 		// define __esModule on exports
/******/ 		__nccwpck_require__.r = function(exports) {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	}();
/******/ 	
/******/ 	/* webpack/runtime/compat */
/******/ 	
/******/ 	if (typeof __nccwpck_require__ !== 'undefined') __nccwpck_require__.ab = __dirname + "/";
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module used 'module' so it can't be inlined
/******/ 	var __webpack_exports__ = __nccwpck_require__(324);
/******/ 	module.exports = __webpack_exports__;
/******/ 	
/******/ })()
;