/**
 * @module postgres-storage
 * @description Optional PostgreSQL persistence layer for Phase 1 dual-write storage.
 * Existing lowdb reads remain the source of truth; these helpers record additive
 * operational metadata when DATABASE_URL is configured.
 */

import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';
import pg from 'pg';
import { createLogger } from '../logger.js';

dotenv.config();

const { Pool } = pg;
const logger = createLogger('postgres');

const DATABASE_URL = process.env.DATABASE_URL?.trim();
const enabled = Boolean(DATABASE_URL);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const migrationsDir = path.join(__dirname, '../../migrations');

/** @type {import('pg').Pool|null} */
let pool = null;

/**
 * Returns whether PostgreSQL persistence is configured.
 * @returns {boolean}
 */
export function isPostgresEnabled() {
    return enabled;
}

/**
 * Lazily creates the PostgreSQL connection pool.
 * @returns {import('pg').Pool|null}
 */
function getPool() {
    if (!enabled) return null;
    if (!pool) {
        pool = new Pool({
            connectionString: DATABASE_URL,
            connectionTimeoutMillis: 2000,
            ssl: DATABASE_URL.includes('sslmode=require') ? { rejectUnauthorized: false } : undefined
        });
        pool.on('error', (err) => {
            logger.error('Unexpected PostgreSQL pool error:', err.message);
        });
    }
    return pool;
}

async function executeQuery(sql, params = []) {
    const db = getPool();
    if (!db) return null;
    return db.query(sql, params);
}

/**
 * Executes a best-effort query against PostgreSQL.
 * @param {string} sql - SQL query text.
 * @param {Array<unknown>} [params=[]] - Query parameters.
 * @returns {Promise<import('pg').QueryResult|null>}
 */
export async function query(sql, params = []) {
    return bestEffort('PostgreSQL query', async () => executeQuery(sql, params));
}

/**
 * Best-effort wrapper for additive writes. Errors are logged but not rethrown
 * so PostgreSQL cannot break the lowdb-backed workflow.
 * @param {string} operation - Human-readable operation name.
 * @param {() => Promise<unknown>} fn - Operation to execute.
 * @returns {Promise<unknown|null>}
 */
async function bestEffort(operation, fn) {
    if (!enabled) return null;
    try {
        return await fn();
    } catch (err) {
        logger.warn(`${operation} skipped: ${err.message}`);
        return null;
    }
}

/**
 * Runs all idempotent SQL migration files.
 * @returns {Promise<boolean>} True if migrations ran successfully or Postgres is disabled.
 */
export async function runMigrations() {
    if (!enabled) {
        logger.info('DATABASE_URL not set; PostgreSQL persistence disabled.');
        return true;
    }

    return Boolean(await bestEffort('PostgreSQL migrations', async () => {
        const files = (await fs.readdir(migrationsDir))
            .filter(file => file.endsWith('.sql'))
            .sort();

        for (const file of files) {
            const sql = await fs.readFile(path.join(migrationsDir, file), 'utf-8');
            await executeQuery(sql);
            logger.info(`Applied migration ${file}`);
        }
        return true;
    }));
}

/**
 * Converts a legacy timestamp-like account id into a best-effort creation date.
 * @param {string} legacyId - Existing lowdb account id.
 * @returns {Date}
 */
function createdAtFromLegacyId(legacyId) {
    const timestamp = Number(legacyId);
    if (Number.isFinite(timestamp) && timestamp > 0) {
        const date = new Date(timestamp);
        if (!Number.isNaN(date.getTime())) return date;
    }
    return new Date();
}

/**
 * Inserts or updates the PostgreSQL account mirror for a lowdb account.
 * @param {import('../types.js').Account} account - lowdb account record.
 * @returns {Promise<string|null>} PostgreSQL account UUID, when available.
 */
export async function upsertAutomationAccount(account) {
    if (!account?.id) return null;

    return bestEffort('Account sync', async () => {
        const result = await executeQuery(`
            INSERT INTO automation_accounts (
                id,
                legacy_id,
                label,
                target_server,
                status,
                last_run_at,
                encrypted_code,
                server_toggle,
                created_at,
                updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
            ON CONFLICT (legacy_id) DO UPDATE SET
                label = EXCLUDED.label,
                target_server = EXCLUDED.target_server,
                status = EXCLUDED.status,
                last_run_at = EXCLUDED.last_run_at,
                encrypted_code = COALESCE(EXCLUDED.encrypted_code, automation_accounts.encrypted_code),
                server_toggle = COALESCE(EXCLUDED.server_toggle, automation_accounts.server_toggle),
                updated_at = NOW()
            RETURNING id
        `, [
            randomUUID(),
            account.id,
            account.name,
            account.targetServer,
            account.status,
            account.lastRun || null,
            account.encryptedCode || null,
            account.serverToggle !== undefined ? account.serverToggle : true,
            createdAtFromLegacyId(account.id)
        ]);

        return result?.rows?.[0]?.id || null;
    });
}

/**
 * Synchronizes all lowdb accounts into PostgreSQL.
 * @param {Array<import('../types.js').Account>} accounts - lowdb accounts.
 * @returns {Promise<number>} Number of accounts attempted.
 */
export async function syncAutomationAccounts(accounts) {
    if (!Array.isArray(accounts)) return 0;
    let count = 0;
    for (const account of accounts) {
        const accountId = await upsertAutomationAccount(account);
        if (accountId) count++;
    }
    return count;
}

/**
 * Updates the mirrored account status after lowdb has been updated.
 * @param {import('../types.js').Account} account - Updated lowdb account.
 * @returns {Promise<void>}
 */
export async function recordAccountStatus(account) {
    await upsertAutomationAccount(account);
}

/**
 * Marks a mirrored account as removed when it is deleted from lowdb.
 * @param {string} legacyId - Existing lowdb account id.
 * @returns {Promise<void>}
 */
export async function recordAccountRemoved(legacyId) {
    if (!legacyId) return;

    await bestEffort('Account removal sync', async () => {
        await executeQuery(`
            UPDATE automation_accounts
            SET status = 'removed',
                updated_at = NOW()
            WHERE legacy_id = $1
        `, [legacyId]);
    });
}

/**
 * Creates a queue run record.
 * @param {string} triggerType - Source of the run, such as startup or manual.
 * @returns {Promise<string|null>} Queue run UUID.
 */
export async function startQueueRun(triggerType) {
    return bestEffort('Queue run start', async () => {
        const id = randomUUID();
        await executeQuery(`
            INSERT INTO queue_runs (id, trigger_type, status, started_at)
            VALUES ($1, $2, $3, NOW())
        `, [id, triggerType, 'running']);
        return id;
    });
}

/**
 * Marks a queue run finished.
 * @param {string|null} queueRunId - Queue run UUID.
 * @param {string} status - Final status.
 * @returns {Promise<void>}
 */
export async function finishQueueRun(queueRunId, status) {
    if (!queueRunId) return;
    await bestEffort('Queue run finish', async () => {
        await executeQuery(`
            UPDATE queue_runs
            SET status = $2,
                finished_at = NOW(),
                stop_requested_at = CASE WHEN $2 = 'stopped' THEN COALESCE(stop_requested_at, NOW()) ELSE stop_requested_at END
            WHERE id = $1
        `, [queueRunId, status]);
    });
}

/**
 * Creates a task job for an account execution.
 * @param {{queueRunId?: string|null, account: import('../types.js').Account, scheduledFor?: string|null}} params
 * @returns {Promise<string|null>} Job UUID.
 */
export async function startTaskJob({ queueRunId = null, account, scheduledFor = null }) {
    if (!account?.id) return null;

    return bestEffort('Task job start', async () => {
        const accountId = await upsertAutomationAccount(account);
        if (!accountId) return null;

        const jobId = randomUUID();
        await executeQuery(`
            INSERT INTO task_jobs (
                id,
                queue_run_id,
                account_id,
                status,
                scheduled_for,
                started_at,
                created_at
            )
            VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
        `, [jobId, queueRunId, accountId, 'running', scheduledFor]);
        return jobId;
    });
}

/**
 * Marks a task job finished.
 * @param {string|null} jobId - Job UUID.
 * @param {{status: string, resultReason?: string|null}} params
 * @returns {Promise<void>}
 */
export async function finishTaskJob(jobId, { status, resultReason = null }) {
    if (!jobId) return;

    await bestEffort('Task job finish', async () => {
        await executeQuery(`
            UPDATE task_jobs
            SET status = $2,
                finished_at = NOW(),
                result_reason = $3
            WHERE id = $1
        `, [jobId, status, resultReason]);
    });
}

/**
 * Records a single execution attempt.
 * @param {{
 *   jobId: string|null,
 *   attemptNo: number,
 *   status: string,
 *   startedAt: number|Date|string,
 *   finishedAt?: number|Date|string|null,
 *   errorCode?: string|null,
 *   errorMessage?: string|null,
 *   deferReason?: string|null
 * }} params
 * @returns {Promise<void>}
 */
export async function recordTaskAttempt(params) {
    const { jobId, attemptNo, status, startedAt, finishedAt = new Date(), errorCode = null, errorMessage = null, deferReason = null } = params;
    if (!jobId) return;

    await bestEffort('Task attempt record', async () => {
        const started = new Date(startedAt);
        const finished = new Date(finishedAt);
        const durationMs = Number.isNaN(started.getTime()) || Number.isNaN(finished.getTime())
            ? null
            : Math.max(0, finished.getTime() - started.getTime());

        await executeQuery(`
            INSERT INTO task_attempts (
                id,
                job_id,
                attempt_no,
                status,
                started_at,
                finished_at,
                error_code,
                error_message,
                defer_reason,
                duration_ms
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `, [
            randomUUID(),
            jobId,
            attemptNo,
            status,
            started,
            finished,
            errorCode,
            errorMessage,
            deferReason,
            durationMs
        ]);
    });
}

/**
 * Marks stale running rows from previous processes as interrupted.
 * @param {Date} processStartedAt - Timestamp captured at current process startup.
 * @returns {Promise<{accounts: number, jobs: number, queueRuns: number}>}
 */
export async function markInterruptedWork(processStartedAt) {
    const fallback = { accounts: 0, jobs: 0, queueRuns: 0 };
    return await bestEffort('Crash recovery', async () => {
        const accounts = await executeQuery(`
            UPDATE automation_accounts
            SET status = 'interrupted',
                updated_at = NOW()
            WHERE status = 'running'
              AND updated_at < $1
            RETURNING id
        `, [processStartedAt]);

        const jobs = await executeQuery(`
            UPDATE task_jobs
            SET status = 'interrupted',
                finished_at = NOW(),
                result_reason = COALESCE(result_reason, 'Interrupted by process restart')
            WHERE status = 'running'
              AND started_at < $1
            RETURNING id
        `, [processStartedAt]);

        const queueRuns = await executeQuery(`
            UPDATE queue_runs
            SET status = 'interrupted',
                finished_at = NOW()
            WHERE status = 'running'
              AND started_at < $1
            RETURNING id
        `, [processStartedAt]);

        return {
            accounts: accounts?.rowCount || 0,
            jobs: jobs?.rowCount || 0,
            queueRuns: queueRuns?.rowCount || 0
        };
    }) || fallback;
}

/**
 * Returns recent jobs for internal API endpoints.
 * @param {number} [limit=50] - Max rows.
 * @returns {Promise<Array<Object>>}
 */
export async function getRecentJobs(limit = 50) {
    const result = await query(`
        SELECT
            task_jobs.id,
            task_jobs.queue_run_id,
            task_jobs.status,
            task_jobs.scheduled_for,
            task_jobs.started_at,
            task_jobs.finished_at,
            task_jobs.result_reason,
            task_jobs.created_at,
            automation_accounts.legacy_id,
            automation_accounts.label AS account_label
        FROM task_jobs
        LEFT JOIN automation_accounts ON automation_accounts.id = task_jobs.account_id
        ORDER BY task_jobs.created_at DESC
        LIMIT $1
    `, [limit]);
    return result?.rows || [];
}

/**
 * Returns mirrored accounts for internal API endpoints.
 * @returns {Promise<Array<Object>>}
 */
export async function getStoredAccounts() {
    const result = await query(`
        SELECT
            id,
            legacy_id,
            label,
            target_server,
            status,
            last_run_at,
            created_at,
            updated_at
        FROM automation_accounts
        ORDER BY label ASC
    `);
    return result?.rows || [];
}

/**
 * Retrieves all accounts from PostgreSQL that are not removed.
 * @returns {Promise<Array<Object>>}
 */
export async function getAccountsFromDb() {
    const result = await query(`
        SELECT * FROM automation_accounts
        WHERE status != 'removed'
        ORDER BY label ASC
    `);
    return (result?.rows || []).map(row => ({
        id: row.legacy_id,
        name: row.label,
        targetServer: row.target_server,
        serverToggle: row.server_toggle,
        lastRun: row.last_run_at ? row.last_run_at.toISOString() : null,
        status: row.status
    }));
}

/**
 * Fetches and maps a single account from PostgreSQL.
 * @param {string} id - The legacy_id of the account.
 * @returns {Promise<Object|null>}
 */
export async function getAccountDecryptedFromDb(id) {
    const result = await query(`
        SELECT * FROM automation_accounts
        WHERE legacy_id = $1 AND status != 'removed'
    `, [id]);
    const row = result?.rows?.[0];
    if (!row) return null;
    return {
        id: row.legacy_id,
        name: row.label,
        encryptedCode: row.encrypted_code,
        targetServer: row.target_server,
        serverToggle: row.server_toggle,
        lastRun: row.last_run_at ? row.last_run_at.toISOString() : null,
        status: row.status
    };
}

/**
 * Gets a global configuration value from PostgreSQL.
 * @param {string} key - Settings key.
 * @returns {Promise<string|null>}
 */
export async function getSettingFromDb(key) {
    const result = await query('SELECT value FROM bot_settings WHERE key = $1', [key]);
    return result?.rows?.[0]?.value || null;
}

/**
 * Retrieves all global settings as a key-value object from PostgreSQL.
 * @returns {Promise<Object>}
 */
export async function getAllSettingsFromDb() {
    const result = await query('SELECT key, value FROM bot_settings');
    const settings = {};
    for (const row of result?.rows || []) {
        settings[row.key] = row.value;
    }
    return settings;
}

/**
 * Idempotently imports accounts and settings from db.json into PostgreSQL
 * if the PostgreSQL database does not already contain accounts.
 * @returns {Promise<void>}
 */
export async function syncFromLowdbIfEmpty() {
    if (!enabled) return;

    try {
        const countResult = await executeQuery('SELECT COUNT(*)::int AS count FROM automation_accounts');
        const count = countResult?.rows?.[0]?.count || 0;

        if (count > 0) {
            logger.info('PostgreSQL already contains account data. Skipping auto-migration.');
            return;
        }

        logger.info('PostgreSQL is empty. Seeding from db.json...');
        const dbPath = path.join(__dirname, '../../db.json');
        
        let raw;
        try {
            raw = await fs.readFile(dbPath, 'utf-8');
        } catch (err) {
            logger.warn(`Could not read db.json: ${err.message}`);
            return;
        }

        let data;
        try {
            data = JSON.parse(raw);
        } catch (err) {
            logger.warn(`Could not parse db.json: ${err.message}`);
            return;
        }

        const accounts = Array.isArray(data?.accounts) ? data.accounts : [];
        const settings = data?.settings || {};

        for (const account of accounts) {
            if (!account.id) continue;
            await executeQuery(`
                INSERT INTO automation_accounts (
                    id,
                    legacy_id,
                    label,
                    target_server,
                    status,
                    last_run_at,
                    encrypted_code,
                    server_toggle,
                    created_at,
                    updated_at
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
                ON CONFLICT (legacy_id) DO UPDATE SET
                    label = EXCLUDED.label,
                    target_server = EXCLUDED.target_server,
                    status = EXCLUDED.status,
                    last_run_at = EXCLUDED.last_run_at,
                    encrypted_code = COALESCE(EXCLUDED.encrypted_code, automation_accounts.encrypted_code),
                    server_toggle = COALESCE(EXCLUDED.server_toggle, automation_accounts.server_toggle),
                    updated_at = NOW()
            `, [
                randomUUID(),
                account.id,
                account.name,
                account.targetServer,
                account.status,
                account.lastRun || null,
                account.encryptedCode || null,
                account.serverToggle !== undefined ? account.serverToggle : true,
                createdAtFromLegacyId(account.id)
            ]);
        }

        const settingMapping = {
            scheduleStart: 'schedule_start',
            scheduleEnd: 'schedule_end',
            lastResetDate: 'last_reset_date',
            cookies: 'cookies',
            adminRoleId: 'admin_role_id',
            logChannelId: 'log_channel_id'
        };

        for (const [key, pgKey] of Object.entries(settingMapping)) {
            const val = settings[key];
            if (val !== undefined && val !== null) {
                await executeQuery(`
                    INSERT INTO bot_settings (key, value)
                    VALUES ($1, $2)
                    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
                `, [pgKey, String(val)]);
            }
        }

        logger.info(`Idempotent startup sync completed. Synced ${accounts.length} accounts.`);
    } catch (err) {
        logger.warn(`syncFromLowdbIfEmpty failed: ${err.message}`);
    }
}


/**
 * Closes the PostgreSQL pool, if opened.
 * @returns {Promise<void>}
 */
export async function closePostgres() {
    if (pool) {
        try {
            await pool.end();
        } catch (err) {
            logger.warn(`PostgreSQL pool close skipped: ${err.message}`);
        } finally {
            pool = null;
        }
    }
}

