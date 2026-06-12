/**
 * One-time/idempotent importer for mirroring db.json accounts into PostgreSQL.
 * Reads lowdb data directly; db.json remains the source of truth in Phase 1.
 */

import fs from 'fs/promises';
import { createLogger } from '../src/logger.js';
import { isPostgresEnabled, runMigrations, syncAutomationAccounts, closePostgres } from '../src/storage/postgres.js';

const logger = createLogger('import');
const DB_PATH = 'db.json';

/**
 * Reads and parses the local lowdb database file.
 * @returns {Promise<Object>}
 */
async function readLowdbData() {
    try {
        const raw = await fs.readFile(DB_PATH, 'utf-8');
        return JSON.parse(raw);
    } catch (err) {
        throw new Error(`Unable to read or parse ${DB_PATH}: ${err.message}`);
    }
}

async function main() {
    if (!isPostgresEnabled()) {
        logger.warn('DATABASE_URL is not set. Nothing to import.');
        process.exitCode = 1;
        return;
    }

    const migrated = await runMigrations();
    if (!migrated) {
        logger.error('PostgreSQL migrations did not complete. Import aborted.');
        process.exitCode = 1;
        return;
    }

    const data = await readLowdbData();
    const accounts = Array.isArray(data.accounts) ? data.accounts : [];

    const count = await syncAutomationAccounts(accounts);
    logger.info(`Imported or updated ${count} account mirror(s) from ${DB_PATH}.`);
}

main()
    .catch((err) => {
        logger.error('Import failed:', err);
        process.exitCode = 1;
    })
    .finally(async () => {
        await closePostgres();
    });
