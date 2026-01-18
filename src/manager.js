import cron from 'node-cron';
import { getAccounts, updateAccountStatus, getAccountDecrypted, resetAllStatuses } from './db.js';
import { runSession } from './runner.js';
import { sendLog } from './bot.js';
import { AsyncLock } from './async-lock.js';
import { config } from './config.js';
import { updateActivity } from './health-server.js';
import { rotateLogs } from './log-rotator.js';

const lock = new AsyncLock(); // Prevent race conditions
let isRunning = false;
let shouldStop = false; // Kill-switch flag
const deferredAccounts = new Map(); // Track deferred accounts with timestamps
const deferCycles = new Map(); // Track defer cycle count per account

export const forceStop = () => {
    console.log('[Manager] 🛑 FORCE STOP activated');
    shouldStop = true;
};

export const startScheduler = () => {
    console.log('[Manager] Scheduler started.');
    const now = new Date();
    console.log(`[Manager] Current system time: ${now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST`);
    console.log(`[Manager] Next daily reset scheduled for: 00:00 IST (Asia/Kolkata timezone)`);

    // Clean old logs on startup
    rotateLogs().catch(err => console.error('[Manager] Log rotation error:', err));

    // Daily reset at 00:00 IST (Asia/Kolkata timezone)
    cron.schedule('0 0 * * *', async () => {
        const triggerTime = new Date();
        console.log(`[Manager] Daily reset triggered at ${triggerTime.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST`);
        await resetAllStatuses();
        deferredAccounts.clear(); // Clear defer timestamps
        deferCycles.clear(); // Clear defer cycle counts
        sendLog('🔄 **Daily Reset**: All accounts reset to pending status', 'info');

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
    const MAX_RETRY_ATTEMPTS = config.MAX_RETRY_ATTEMPTS;

    try {
        const accounts = await getAccounts();
        const pendingAccounts = accounts.filter(a => a.status === 'idle' || a.status === 'pending');

        if (pendingAccounts.length === 0) {
            console.log('[Manager] No pending accounts');
            isRunning = false;
            return;
        }

        console.log(`[Manager] Processing ${pendingAccounts.length} accounts...`);
        await sendLog(`▶️ **Queue Started**: Processing ${pendingAccounts.length} accounts`, 'info');

        for (let i = 0; i < pendingAccounts.length; i++) {
            // Check kill-switch
            if (shouldStop) {
                console.log('[Manager] 🛑 Kill-switch activated - stopping queue');
                await sendLog('🛑 **Queue Stopped**: Force stop activated', 'error');
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
                await updateAccountStatus(account.id, 'running');

                // Run session - pass shared browser
                updateActivity();
                const result = await runSession(await getAccountDecrypted(account.id), sharedBrowser);

                if (result.success) {
                    console.log(`[Manager] ✅ ${account.name} completed successfully`);
                    await updateAccountStatus(account.id, 'done', new Date().toISOString());
                    await sendLog(`✅ **${account.name}**: Session completed successfully`, 'success');

                    // Update shared browser reference
                    sharedBrowser = result.browser;

                } else if (result.defer) {
                    const attempts = (retryCounts.get(account.id) || 0) + 1;
                    retryCounts.set(account.id, attempts);

                    // Track defer cycles
                    const cycles = (deferCycles.get(account.id) || 0) + 1;
                    deferCycles.set(account.id, cycles);

                    if (attempts <= MAX_RETRY_ATTEMPTS && cycles <= config.MAX_DEFER_CYCLES) {
                        console.log(`[Manager] ⏭️  ${account.name} deferred (Zigza error) - Attempt ${attempts}/3, Cycle ${cycles}/3`);
                        await updateAccountStatus(account.id, 'deferred');
                        await sendLog(`⚠️ **${account.name}**: Deferred (Zigza) - Attempt ${attempts}/3, Cycle ${cycles}/3`, 'warning');

                        // Mark defer timestamp
                        deferredAccounts.set(account.id, Date.now());
                        // Add to end of queue
                        pendingAccounts.push(account);

                        sharedBrowser = result.browser;
                    } else {
                        console.log(`[Manager] ❌ ${account.name} failed: Max Zigza retries or defer cycles reached`);
                        await updateAccountStatus(account.id, 'error');
                        await sendLog(`❌ **${account.name}**: Failed - Max retries/cycles reached`, 'error');
                        sharedBrowser = result.browser;
                    }

                } else {
                    // ... (Failed logic)
                    console.log(`[Manager] ❌ ${account.name} failed: ${result.reason}`);
                    await updateAccountStatus(account.id, 'error');
                    await sendLog(`❌ **${account.name}**: Failed - ${result.reason}`, 'error');
                    sharedBrowser = result.browser;
                }

            } catch (err) {
                const attempts = (retryCounts.get(account.id) || 0) + 1;
                retryCounts.set(account.id, attempts);

                // Check if we should retry
                if (attempts <= MAX_RETRY_ATTEMPTS) {
                    console.log(`[Manager] ⚠️ Error for ${account.name} (Attempt ${attempts}/${MAX_RETRY_ATTEMPTS}). Retrying...`);
                    await sendLog(`🔄 **${account.name}**: Error (${err.message}) - Retry ${attempts}/3`, 'warning');

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
                await updateAccountStatus(account.id, 'error');
                await sendLog(`❌ **${account.name}**: Failed - Max retries reached (${err.message})`, 'error');

                // Still close browser to leave clean state for NEXT account
                if (sharedBrowser) {
                    try { await sharedBrowser.close(); } catch (e) { }
                    sharedBrowser = null;
                }
            }

            // Wait between accounts
            if (i < pendingAccounts.length - 1 && !shouldStop) {
                console.log(`[Manager] Waiting ${config.ACCOUNT_DELAY_MS / 1000} seconds before next ID...`);
                await new Promise(r => setTimeout(r, config.ACCOUNT_DELAY_MS));

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
        await sendLog('✅ **Queue Complete**: All accounts processed', 'success');

    } catch (err) {
        console.error('[Manager] Queue error:', err);
        await sendLog(`❌ **Queue Error**: ${err.message}`, 'error');

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

export const runBatch = async (accounts) => {
    // For manual /force_run_all
    return processQueueFull();
};

export const executeSession = async (accountId) => {
    // For manual /force_run {name}
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

        console.log(`[Manager] Running single account: ${account.name}`);
        await updateAccountStatus(account.id, 'running');

        const result = await runSession(account, null);
        browser = result.browser;

        if (result.success) {
            await updateAccountStatus(account.id, 'done', new Date().toISOString());
            await sendLog(`✅ **${account.name}**: Session completed successfully`, 'success');
            return { success: true };
        } else {
            await updateAccountStatus(account.id, 'error');
            await sendLog(`❌ **${account.name}**: Failed - ${result.reason}`, 'error');
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

export const executeFountain = async (accountId) => {
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

export const runFountainBatch = async () => {
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
