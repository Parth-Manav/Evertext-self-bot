import fs from 'fs/promises';
import path from 'path';

// Clean logs older than 24 hours
export const rotateLogs = async () => {
    try {
        const logDir = './logs'; // Assuming logs are here, or just root
        // For this bot, logs are mostly stdout, but let's check for any .log files
        // If you don't save files, this cleans temp files or screenshots

        const files = await fs.readdir('.');
        const now = Date.now();
        const MAX_AGE = 24 * 60 * 60 * 1000; // 24 Hours

        let deletedCount = 0;

        for (const file of files) {
            if (file.endsWith('.log') || file.endsWith('.tmp') || file.endsWith('.png')) {
                const stats = await fs.stat(file);
                if (now - stats.mtimeMs > MAX_AGE) {
                    await fs.unlink(file);
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
