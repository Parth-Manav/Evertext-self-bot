/**
 * @module metrics-storage
 * @description Internal PostgreSQL metrics queries for Phase 1 persistence.
 */

import { isPostgresEnabled, query } from './postgres.js';

/**
 * Counts all recorded jobs.
 * @returns {Promise<number>}
 */
export async function getTotalJobsRun() {
    if (!isPostgresEnabled()) return 0;
    const result = await query('SELECT COUNT(*)::int AS count FROM task_jobs');
    return result?.rows?.[0]?.count || 0;
}

/**
 * Counts jobs that completed successfully.
 * @returns {Promise<number>}
 */
export async function getSuccessfulJobs() {
    if (!isPostgresEnabled()) return 0;
    const result = await query(`
        SELECT COUNT(*)::int AS count
        FROM task_jobs
        WHERE status = 'success'
    `);
    return result?.rows?.[0]?.count || 0;
}

/**
 * Counts jobs that ended in failure.
 * @returns {Promise<number>}
 */
export async function getFailedJobs() {
    if (!isPostgresEnabled()) return 0;
    const result = await query(`
        SELECT COUNT(*)::int AS count
        FROM task_jobs
        WHERE status = 'failed'
    `);
    return result?.rows?.[0]?.count || 0;
}

/**
 * Calculates average finished job runtime in milliseconds.
 * @returns {Promise<number|null>}
 */
export async function getAverageRuntimeMs() {
    if (!isPostgresEnabled()) return null;
    const result = await query(`
        SELECT ROUND(AVG(EXTRACT(EPOCH FROM (finished_at - started_at)) * 1000))::int AS average_ms
        FROM task_jobs
        WHERE started_at IS NOT NULL
          AND finished_at IS NOT NULL
    `);
    return result?.rows?.[0]?.average_ms ?? null;
}

/**
 * Returns retry counts per account. Attempts after attempt_no=1 are counted as retries.
 * @returns {Promise<Array<{legacy_id: string, label: string, retry_count: number}>>}
 */
export async function getRetryCountsPerAccount() {
    if (!isPostgresEnabled()) return [];
    const result = await query(`
        SELECT
            automation_accounts.legacy_id,
            automation_accounts.label,
            COUNT(task_attempts.id) FILTER (WHERE task_attempts.attempt_no > 1)::int AS retry_count
        FROM automation_accounts
        LEFT JOIN task_jobs ON task_jobs.account_id = automation_accounts.id
        LEFT JOIN task_attempts ON task_attempts.job_id = task_jobs.id
        GROUP BY automation_accounts.legacy_id, automation_accounts.label
        ORDER BY retry_count DESC, automation_accounts.label ASC
    `);
    return result?.rows || [];
}

/**
 * Returns the metrics payload used by the internal HTTP endpoint.
 * @returns {Promise<Object>}
 */
export async function getMetricsSummary() {
    return {
        enabled: isPostgresEnabled(),
        totalJobsRun: await getTotalJobsRun(),
        successfulJobs: await getSuccessfulJobs(),
        failedJobs: await getFailedJobs(),
        averageRuntimeMs: await getAverageRuntimeMs(),
        retryCountsPerAccount: await getRetryCountsPerAccount()
    };
}
