import http from 'http';

let isHealthy = true;
let lastActivityTime = Date.now();

export function startHealthServer(port = 3000) {
    const server = http.createServer((req, res) => {
        if (req.url === '/health' || req.url === '/ping') {
            const uptimeSeconds = Math.floor(process.uptime());
            const timeSinceActivity = Date.now() - lastActivityTime;

            // Consider unhealthy if no activity for 30 min (customizable)
            // For now, we just report stats. 
            // In future, you can set `isHealthy = false` on critical errors.
            const healthy = isHealthy;

            res.writeHead(healthy ? 200 : 503, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                status: healthy ? 'ok' : 'degraded',
                uptime: uptimeSeconds,
                lastActivitySeconds: Math.floor(timeSinceActivity / 1000),
                memoryMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
            }));
        } else {
            res.writeHead(404);
            res.end('Not Found');
        }
    });

    server.listen(port, () => {
        console.log(`[Health] Server listening on port ${port}`);
    });

    server.on('error', (err) => {
        console.error('[Health] Server error:', err.message);
    });
}

export function updateActivity() {
    lastActivityTime = Date.now();
}

export function setHealthy(healthy) {
    isHealthy = healthy;
}
