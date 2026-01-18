import WebSocket from 'ws';
import { EventEmitter } from 'events';

const BASE_URL = 'wss://evertext.sytes.net/socket.io/?EIO=4&transport=websocket';

export class EvertextWebSocketClient extends EventEmitter {
    constructor(sessionCookie) {
        super();
        this.sessionCookie = sessionCookie;
        this.ws = null;
        this.sid = null;
        this.pingInterval = null;
        this.connected = false;
        this.lastActivity = Date.now();
        this.activityCheckInterval = null;
    }

    async connect() {
        return new Promise((resolve, reject) => {
            const headers = {
                'Cookie': `session=${this.sessionCookie}`,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Origin': 'https://evertext.sytes.net',
                'Host': 'evertext.sytes.net'
            };

            console.log('[WebSocket] Connecting to EverText terminal...');

            this.ws = new WebSocket(BASE_URL, { headers });

            const timeout = setTimeout(() => {
                reject(new Error('Connection timeout (15s)'));
                this.ws?.close();
            }, 15000);

            this.ws.on('open', () => {
                console.log('[WebSocket] Connection opened, waiting for handshake...');
            });

            this.ws.on('message', (data) => {
                clearTimeout(timeout);
                const message = data.toString();
                this.lastActivity = Date.now(); // Track activity for heartbeat

                // Handle Socket.IO protocol messages
                if (message.startsWith('0')) {
                    // Open packet with session info
                    try {
                        const json = JSON.parse(message.substring(1));
                        this.sid = json.sid;
                        this.pingInterval = json.pingInterval || 25000;
                        console.log(`[WebSocket] Connected! Session ID: ${this.sid}`);

                        // Send namespace upgrade
                        this.ws.send('40');
                        this.connected = true;

                        // Start ping interval
                        this._startPing();

                        resolve();
                    } catch (e) {
                        reject(new Error('Failed to parse handshake: ' + e.message));
                    }
                } else if (message === '2') {
                    // Server ping - respond with pong
                    if (this.ws) {
                        this.ws.send('3');
                    }
                } else if (message.startsWith('40')) {
                    // Namespace connected
                    console.log('[WebSocket] Namespace connected. Ready for events.');
                } else if (message.startsWith('42')) {
                    // Event packet
                    this._handleEvent(message);
                }
            });

            this.ws.on('error', (err) => {
                clearTimeout(timeout);
                console.error('[WebSocket] Error:', err.message);
                reject(err);
            });

            this.ws.on('close', () => {
                console.log('[WebSocket] Connection closed');
                this.connected = false;
                this._stopPing();
                this.emit('disconnect');
            });
        });
    }

    _startPing() {
        // Send periodic pings to keep connection alive
        this._pingTimer = setInterval(() => {
            if (this.connected && this.ws?.readyState === WebSocket.OPEN) {
                this.ws.send('2');
            }
        }, Math.floor(this.pingInterval * 0.8)); // Ping before server expects it

        // Start activity checker (Issue #30 fix)
        this.activityCheckInterval = setInterval(() => {
            const timeSinceActivity = Date.now() - this.lastActivity;
            if (timeSinceActivity > 120000) { // 2 minutes of silence
                console.warn('[WebSocket] No activity for 2 minutes - connection may be dead');
                this.emit('error', new Error('CONNECTION_TIMEOUT'));
                this.close();
            }
        }, 30000); // Check every 30 seconds
    }

    _stopPing() {
        if (this._pingTimer) {
            clearInterval(this._pingTimer);
            this._pingTimer = null;
        }
        if (this.activityCheckInterval) {
            clearInterval(this.activityCheckInterval);
            this.activityCheckInterval = null;
        }
    }

    _handleEvent(message) {
        try {
            const eventData = JSON.parse(message.substring(2));
            const [eventName, payload] = eventData;

            if (eventName === 'output') {
                // Terminal output event
                this.emit('output', payload.data);
            } else if (eventName === 'idle_timeout') {
                console.log('[WebSocket] Server sent idle_timeout');
                this.emit('error', new Error('IDLE_TIMEOUT'));
            } else if (eventName === 'connection_failed') {
                console.log('[WebSocket] Server sent connection_failed');
                this.emit('error', new Error('CONNECTION_FAILED'));
            } else if (eventName === 'disconnect') {
                console.log('[WebSocket] Server sent disconnect event');
                this.emit('disconnect');
            } else if (eventName === 'user_count_update') {
                // User count event - validate and emit for runner to check
                if (payload && typeof payload.current_users === 'number' && typeof payload.max_users === 'number') {
                    this.emit('user_count', payload);
                    console.log(`[WebSocket] User count: ${payload.current_users}/${payload.max_users}`);
                } else {
                    console.warn('[WebSocket] Invalid user_count_update payload:', payload);
                }
            } else if (eventName === 'activity_ping') {
                // Harmless heartbeat - ignore silently
                return;
            } else {
                // Unknown event - log for debugging
                console.log(`[WebSocket] Unknown event: ${eventName}`);
            }
        } catch (e) {
            console.error('[WebSocket] Failed to parse event:', e.message);
        }
    }

    async sendCommand(command) {
        console.log(`[WebSocket] 📤 Attempting to send command: "${command}"`);

        if (!this.ws) {
            console.error('[WebSocket] ❌ WebSocket object is null');
            throw new Error('WebSocket not initialized');
        }

        const state = this.ws.readyState;
        const stateNames = ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'];
        console.log(`[WebSocket] Connection state: ${stateNames[state]} (${state})`);

        if (!this.connected || state !== WebSocket.OPEN) {
            console.error(`[WebSocket] ❌ Cannot send - not connected (state: ${stateNames[state]})`);
            throw new Error('WebSocket not connected');
        }

        const payload = JSON.stringify(['input', { input: command }]);
        console.log(`[WebSocket] 📡 Sending payload: ${payload}`);

        try {
            this.ws.send('42' + payload);
            console.log(`[WebSocket] ✅ Command sent successfully`);
        } catch (err) {
            console.error(`[WebSocket] ❌ Failed to send:`, err.message);
            throw err;
        }

        // Small delay to prevent flooding
        await new Promise(r => setTimeout(r, 300));
    }

    async startTerminal() {
        if (!this.connected) {
            throw new Error('Must connect before starting terminal');
        }

        console.log('[WebSocket] Sending stop event (cleanup)...');
        const stopPayload = JSON.stringify(['stop', {}]);
        this.ws.send('42' + stopPayload);

        await new Promise(r => setTimeout(r, 500));

        console.log('[WebSocket] Sending start event...');
        const startPayload = JSON.stringify(['start', { args: '' }]);
        this.ws.send('42' + startPayload);
    }

    close() {
        console.log('[WebSocket] Closing connection...');
        this._stopPing();
        this.connected = false;
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }
}
