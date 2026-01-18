// Central configuration for the bot
// All timeout values and constants in one place

export const config = {
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
