import { startScheduler, forceStop } from './src/manager.js';
import { startBot, client } from './src/bot.js'; // client needed for shutdown
import { exec } from 'child_process';
import { promisify } from 'util';
import { startHealthServer } from './src/health-server.js';

const execAsync = promisify(exec);

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
    forceStop();

    // Disconnect Discord bot
    if (client) {
        console.log('[Shutdown] Disconnecting Discord bot...');
        await client.destroy();
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
    await killOrphanedChrome();

    // Start Health Check (for Zeabur)
    const port = process.env.PORT || 3000;
    startHealthServer(port);

    // Start App
    startScheduler();
    startBot();
})();
