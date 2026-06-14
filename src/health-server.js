/**
 * @module health-server
 * @description HTTP health-check endpoint for container orchestration and uptime monitoring.
 */

import http from 'http';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { createLogger } from './logger.js';
import { getMetricsSummary } from './storage/metrics.js';
import { getRecentJobs, getStoredAccounts, isPostgresEnabled } from './storage/postgres.js';

const logger = createLogger('health');
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dashboardPath = path.join(__dirname, 'dashboard/index.html');

/** @type {boolean} */
let isHealthy = true;

/** @type {number} */
let lastActivityTime = Date.now();

const runtimeState = {
    queueRunning: false,
    activeAccount: null,
    brainRunning: false
};

function getDurationMs(startedAt, finishedAt) {
    if (!startedAt || !finishedAt) return null;
    const started = new Date(startedAt);
    const finished = new Date(finishedAt);
    if (Number.isNaN(started.getTime()) || Number.isNaN(finished.getTime())) return null;
    return Math.max(0, finished.getTime() - started.getTime());
}

function summarizeAccounts(accounts) {
    const byStatus = {
        pending: 0,
        running: 0,
        done: 0,
        error: 0
    };

    for (const account of accounts) {
        if (account.status in byStatus) {
            byStatus[account.status]++;
        }
    }

    return {
        total: accounts.length,
        byStatus
    };
}

async function getDashboardData() {
    const [metrics, jobs, accounts] = await Promise.all([
        getMetricsSummary(),
        getRecentJobs(50),
        getStoredAccounts()
    ]);

    return {
        metrics: {
            totalJobsRun: metrics.totalJobsRun,
            successfulJobs: metrics.successfulJobs,
            failedJobs: metrics.failedJobs,
            averageRuntimeMs: metrics.averageRuntimeMs
        },
        recentJobs: jobs.map(job => ({
            accountLabel: job.account_label,
            status: job.status,
            startedAt: job.started_at,
            finishedAt: job.finished_at,
            resultReason: job.result_reason,
            durationMs: getDurationMs(job.started_at, job.finished_at)
        })),
        accountsSummary: summarizeAccounts(accounts),
        topRetriedAccounts: (metrics.retryCountsPerAccount || [])
            .filter(account => account.retry_count > 0)
            .slice(0, 10)
    };
}

/**
 * Starts a minimal HTTP server exposing `/health` and `/ping` endpoints.
 * @param {number} [port=3000] - Port to listen on (overridden by `PORT` env in index.js).
 * @returns {import('http').Server} The HTTP server instance.
 */
export function startHealthServer(port = 3000) {
    const server = http.createServer(async (req, res) => {
        const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

        const sendJson = (statusCode, payload) => {
            res.writeHead(statusCode, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(payload));
        };

        const sendHtmlFile = async (filePath) => {
            const content = await fs.readFile(filePath, 'utf-8');
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(content);
        };

        try {
            const apiKey = process.env.DASHBOARD_API_KEY?.trim();
            const protectedPaths = ['/accounts', '/jobs', '/metrics', '/dashboard', '/dashboard/data'];
            if (apiKey && protectedPaths.includes(url.pathname)) {
                const clientKey = req.headers['x-api-key'];
                if (!clientKey || clientKey.trim() !== apiKey) {
                    return sendJson(401, { error: 'Unauthorized' });
                }
            }

            if (url.pathname === '/health' || url.pathname === '/ping') {
                const uptimeSeconds = Math.floor(process.uptime());
                const timeSinceActivity = Date.now() - lastActivityTime;
                const healthy = isHealthy;

                sendJson(healthy ? 200 : 503, {
                    status: healthy ? 'ok' : 'degraded',
                    uptime: uptimeSeconds,
                    lastActivitySeconds: Math.floor(timeSinceActivity / 1000),
                    lastActivityAt: new Date(lastActivityTime).toISOString(),
                    memoryMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
                    queueRunning: runtimeState.queueRunning,
                    activeAccount: runtimeState.activeAccount,
                    brainRunning: runtimeState.brainRunning
                });
            } else if (url.pathname === '/metrics') {
                sendJson(200, await getMetricsSummary());
            } else if (url.pathname === '/jobs') {
                sendJson(200, { jobs: await getRecentJobs() });
            } else if (url.pathname === '/accounts') {
                let accounts;
                if (isPostgresEnabled()) {
                    accounts = await getStoredAccounts();
                } else {
                    const { getAccounts } = await import('./db.js');
                    accounts = await getAccounts();
                }
                const sanitizedAccounts = accounts.map(({ encryptedCode, ...rest }) => rest);
                sendJson(200, { accounts: sanitizedAccounts });
            } else if (url.pathname === '/dashboard/data') {
                sendJson(200, await getDashboardData());
            } else if (url.pathname === '/dashboard') {
                await sendHtmlFile(dashboardPath);
            } else {
                res.writeHead(404);
                res.end('Not Found');
            }
        } catch (err) {
            logger.error('Request failed:', err.message);
            sendJson(500, { error: 'Internal Server Error' });
        }
    });

    server.listen(port, () => {
        logger.info(`Server listening on port ${port}`);
    });

    server.on('error', (err) => {
        logger.error('Server error:', err.message);
    });

    return server;
}

/**
 * Records activity for the health endpoint's last-activity metric.
 * @returns {void}
 */
export function updateActivity() {
    lastActivityTime = Date.now();
}

/**
 * Updates public health metadata without exposing credentials or cookies.
 * @param {{queueRunning?: boolean, activeAccount?: string|null, brainRunning?: boolean}} state
 * @returns {void}
 */
export function updateHealthState(state) {
    if ('queueRunning' in state) runtimeState.queueRunning = Boolean(state.queueRunning);
    if ('activeAccount' in state) runtimeState.activeAccount = state.activeAccount || null;
    if ('brainRunning' in state) runtimeState.brainRunning = Boolean(state.brainRunning);
}

/**
 * Marks the process as healthy or degraded for health-check responses.
 * @param {boolean} healthy - Whether the orchestrator should report ok status.
 * @returns {void}
 */
export function setHealthy(healthy) {
    isHealthy = healthy;
}
