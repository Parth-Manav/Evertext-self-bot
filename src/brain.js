import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class RustBrain {
    constructor() {
        this.process = null;
        this.ready = false;
        this.responseHandlers = [];
    }

    async start() {
        return new Promise((resolve, reject) => {
            // Platform-aware executable name
            const exeName = process.platform === 'win32' ? 'evertext_brain.exe' : 'evertext_brain';

            // Try to resolve path relative to current executable (CAXA/Pkg) or source (Dev)
            // In CAXA, process.execPath is the exe itself, but we need the temp directory where resources are extracted.
            // However, caxa extraction puts things in a temp folder.

            // Common pattern: check adjacent to source first
            let brainPath = path.join(__dirname, '../evertext_brain/target/release', exeName);

            // Quick check if file exists, if not, try root-relative (for packaged app)
            // In caxa, __dirname might is inside the snapshot. 
            // We'll rely on caxa including the directory.

            console.log('[Brain] Resolving Rust brain path...');
            console.log('[Brain] Candidate 1 (Source relative):', brainPath);

            // Note: in caxa, we will include the folder structure. 
            // If this fails, we might need a specific caxa check.

            console.log('[Brain] Starting Rust brain:', brainPath);

            this.process = spawn(brainPath, [], {
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
