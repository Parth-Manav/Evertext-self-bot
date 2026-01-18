import puppeteer from 'puppeteer';

const GAME_URL = 'https://evertext.sytes.net';

export class BrowserController {
    constructor() {
        this.browser = null;
        this.context = null; // Store Incognito Context
        this.page = null;
    }

    // New Arg: sharedBrowser instance (optional)
    async launch(sessionCookie, sharedBrowser = null) {
        console.log('[Browser] Launching Session...');

        if (sharedBrowser) {
            console.log('[Browser] Reusing existing browser instance');
            this.browser = sharedBrowser;
        } else {
            // Launch new browser if none provided
            console.log('[Browser] Starting new Chromium process...');
            this.browser = await puppeteer.launch({
                headless: 'new', // No GUI for Zeabur
                timeout: 30000,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-gpu',
                    '--disable-software-rasterizer',
                    '--disable-accelerated-2d-canvas',
                    '--disable-accelerated-video-decode',
                    '--disable-3d-apis',
                    '--no-zygote',
                    '--disable-extensions',
                    '--disable-component-extensions-with-background-pages',
                    '--disable-default-apps',
                    '--disable-sync',
                    '--disable-translate',
                    '--disable-notifications',
                    '--disable-speech-api',
                    '--disable-webgl',
                    '--disable-web-security',
                    '--disk-cache-size=1',
                    '--media-cache-size=1',
                    '--aggressive-cache-discard',
                    '--disable-cache',
                    '--disable-application-cache',
                    '--disable-offline-load-stale-cache',
                    '--disable-renderer-backgrounding',
                    '--disable-background-timer-throttling',
                    '--disable-backgrounding-occluded-windows',
                    '--disable-ipc-flooding-protection',
                    '--js-flags=--max-old-space-size=128',
                    '--window-size=800,600',
                    '--no-first-run',
                    '--mute-audio'
                ]
            });
        }

        // --- OPTIMIZATION: Incognito Context ---
        // Creates a clean slate instantly (no cookies/cache from previous run)
        console.log('[Browser] Creating Incognito Context...');
        this.context = await this.browser.createBrowserContext();
        this.page = await this.context.newPage();

        await this.page.setViewport({ width: 800, height: 600 });

        // Inject session cookie
        if (sessionCookie) {
            console.log('[Browser] Injecting session cookie...');
            await this.page.setCookie({
                name: 'session',
                value: sessionCookie,
                domain: new URL(GAME_URL).hostname,
                path: '/',
                httpOnly: true
            });
        }

        //Navigate to game
        console.log('[Browser] Navigating to game terminal...');
        await this.page.goto(GAME_URL, { waitUntil: 'domcontentloaded', timeout: 15000 });

        console.log('[Browser] Browser ready');
    }

    async clickStart() {
        if (!this.page) throw new Error('Browser not launched');

        console.log('[Browser] Preparing to start terminal...');

        // Wait for button to be available
        await this.page.waitForSelector('#startBtn', { timeout: 10000 });

        // Check if button is disabled (previous session still running)
        const isDisabled = await this.page.evaluate(() => {
            return document.getElementById('startBtn').disabled;
        });

        if (isDisabled) {
            console.log('[Browser] Start button disabled. Refreshing...');
            await this.page.reload({ waitUntil: 'domcontentloaded' });
            await this.page.waitForSelector('#startBtn', { timeout: 10000 });
        }

        console.log('[Browser] Clicking Start button...');
        await this.page.click('#startBtn');

        // Wait for terminal to initialize
        await this.page.waitForSelector('#connection_status', { timeout: 10000 });

        // Give terminal a moment to fully connect
        await new Promise(r => setTimeout(r, 1000));

        console.log('[Browser] Terminal started and ready');
    }

    async clickStop() {
        if (!this.page) throw new Error('Browser not launched');

        console.log('[Browser] Clicking Stop button...');

        try {
            // Check if stop button exists
            const stopBtn = await this.page.$('#stopBtn');
            if (stopBtn) {
                await this.page.click('#stopBtn');

                // --- OPTIMIZATION: Smart Waiting (Item 3) ---
                console.log('[Browser] Waiting for terminal process to stop...');
                try {
                    // Poll element state instead of hard sleep
                    // Wait until Start Button is ENABLED again
                    await this.page.waitForFunction(() => {
                        const btn = document.getElementById('startBtn');
                        return btn && !btn.disabled;
                    }, { timeout: 5000, polling: 200 }); // Check every 200ms
                    console.log('[Browser] Terminal fully stopped (Start button re-enabled)');
                } catch (e) {
                    console.log('[Browser] Warning: Stop confirmation timed out, but proceeding.');
                }

            } else {
                console.log('[Browser] Stop button not found (terminal probably already stopped)');
            }
        } catch (e) {
            console.log('[Browser] Failed to click stop:', e.message);
        }
    }

    async refresh() {
        if (!this.page) throw new Error('Browser not launched');

        console.log('[Browser] Refreshing page...');
        await this.page.reload({ waitUntil: 'domcontentloaded' });
    }

    async isLoginRequired() {
        if (!this.page) throw new Error('Browser not launched');

        const loginLink = await this.page.$('a[href="/auth/google"]');
        return loginLink !== null;
    }

    async close() {
        // Close Context (Incognito Tab)
        if (this.context) {
            console.log('[Browser] Closing Incognito Context...');
            try { await this.context.close(); } catch (e) { }
            this.context = null;
            this.page = null;
        }

        // IMPORTANT: We do NOT close this.browser here if it was shared.
        // The manager handles closing the actual browser process.
        // If we created it internally (this.browser not shared), we might want to?
        // But for this hybrid design, we rely on the caller to manage the 'browser' instance
        // if they passed it in. If we created it, we should close it? 
        // Let's refine: The Manager owns the browser process. This controller owns the Context.
    }

    isLaunched() {
        return this.page !== null;
    }
}
