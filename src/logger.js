// Centralized logging utility with log levels
// Replaces console.log spam with controlled logging

const LOG_LEVELS = {
    ERROR: 0,
    WARN: 1,
    INFO: 2,
    DEBUG: 3
};

// Set this via env var: LOG_LEVEL=ERROR, WARN, INFO, or DEBUG
const currentLevel = LOG_LEVELS[process.env.LOG_LEVEL?.toUpperCase()] ?? LOG_LEVELS.INFO;

class Logger {
    constructor(module) {
        this.module = module;
    }

    error(...args) {
        if (currentLevel >= LOG_LEVELS.ERROR) {
            console.error(`[${this.module}] [ERROR]`, ...args);
        }
    }

    warn(...args) {
        if (currentLevel >= LOG_LEVELS.WARN) {
            console.warn(`[${this.module}] [WARN]`, ...args);
        }
    }

    info(...args) {
        if (currentLevel >= LOG_LEVELS.INFO) {
            console.log(`[${this.module}] [INFO]`, ...args);
        }
    }

    debug(...args) {
        if (currentLevel >= LOG_LEVELS.DEBUG) {
            console.log(`[${this.module}] [DEBUG]`, ...args);
        }
    }

    // Convenience methods
    log(...args) {
        this.info(...args);
    }
}

// Factory function
export function createLogger(module) {
    return new Logger(module);
}

// Quick guide for migration:
// ERROR: Critical failures, crashes, data loss
// WARN: Issues that should be investigated but don't stop execution
// INFO: Important state changes, user actions, session start/end
// DEBUG: Detailed flow information, data dumps, verbose output
