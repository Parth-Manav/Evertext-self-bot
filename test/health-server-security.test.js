process.env.DATABASE_URL = '';

import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';

// Helper to perform HTTP GET request
function fetchUrl(url, headers = {}) {
    return new Promise((resolve, reject) => {
        const req = http.get(url, { headers }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                let json = null;
                try {
                    json = JSON.parse(data);
                } catch (e) {
                    json = data;
                }
                resolve({ status: res.statusCode, body: json });
            });
        });
        req.on('error', reject);
    });
}

test('/accounts does not expose encryptedCode', async (t) => {
    const origDatabaseUrl = process.env.DATABASE_URL;
    const origDashboardKey = process.env.DASHBOARD_API_KEY;
    
    process.env.DATABASE_URL = '';
    delete process.env.DASHBOARD_API_KEY;

    const { startHealthServer } = await import('../src/health-server.js');
    const { addAccount, removeAccount } = await import('../src/db.js');

    // Add a test account to ensure we have at least one account to verify
    const testAccountName = 'sec_test_temp_acc';
    await addAccount(testAccountName, 'temp_code_123', 'test-server');

    const server = startHealthServer(0);
    await new Promise((resolve) => server.once('listening', resolve));
    const port = server.address().port;

    try {
        const res = await fetchUrl(`http://localhost:${port}/accounts`);
        assert.equal(res.status, 200);
        
        const accounts = res.body.accounts || [];
        const testAcc = accounts.find(a => a.name === testAccountName);
        assert.ok(testAcc, 'Test account should be returned in accounts list');
        
        // Assert Object.keys do not contain encryptedCode or encrypted_code
        for (const acc of accounts) {
            assert.equal('encryptedCode' in acc, false);
            assert.equal('encrypted_code' in acc, false);
        }
    } finally {
        server.close();
        await removeAccount(testAccountName);
        if (origDatabaseUrl) process.env.DATABASE_URL = origDatabaseUrl;
        if (origDashboardKey) process.env.DASHBOARD_API_KEY = origDashboardKey;
    }
});

test('endpoints work without DASHBOARD_API_KEY set', async (t) => {
    const origDatabaseUrl = process.env.DATABASE_URL;
    const origDashboardKey = process.env.DASHBOARD_API_KEY;
    
    process.env.DATABASE_URL = '';
    delete process.env.DASHBOARD_API_KEY;

    const { startHealthServer } = await import('../src/health-server.js');

    const server = startHealthServer(0);
    await new Promise((resolve) => server.once('listening', resolve));
    const port = server.address().port;

    try {
        const resHealth = await fetchUrl(`http://localhost:${port}/health`);
        assert.equal(resHealth.status, 200);

        const resAccounts = await fetchUrl(`http://localhost:${port}/accounts`);
        assert.equal(resAccounts.status, 200);
    } finally {
        server.close();
        if (origDatabaseUrl) process.env.DATABASE_URL = origDatabaseUrl;
        if (origDashboardKey) process.env.DASHBOARD_API_KEY = origDashboardKey;
    }
});

test('/accounts requires X-API-Key when DASHBOARD_API_KEY is set', async (t) => {
    const origDatabaseUrl = process.env.DATABASE_URL;
    const origDashboardKey = process.env.DASHBOARD_API_KEY;
    
    process.env.DATABASE_URL = '';
    process.env.DASHBOARD_API_KEY = 'test-secret-123';

    const { startHealthServer } = await import('../src/health-server.js');

    const server = startHealthServer(0);
    await new Promise((resolve) => server.once('listening', resolve));
    const port = server.address().port;

    try {
        // No header
        const resNoHeader = await fetchUrl(`http://localhost:${port}/accounts`);
        assert.equal(resNoHeader.status, 401);
        assert.deepEqual(resNoHeader.body, { error: 'Unauthorized' });

        // Wrong header
        const resWrongHeader = await fetchUrl(`http://localhost:${port}/accounts`, { 'X-API-Key': 'wrong-value' });
        assert.equal(resWrongHeader.status, 401);

        // Correct header
        const resCorrectHeader = await fetchUrl(`http://localhost:${port}/accounts`, { 'X-API-Key': 'test-secret-123' });
        assert.equal(resCorrectHeader.status, 200);
    } finally {
        server.close();
        if (origDatabaseUrl) process.env.DATABASE_URL = origDatabaseUrl;
        if (origDashboardKey) {
            process.env.DASHBOARD_API_KEY = origDashboardKey;
        } else {
            delete process.env.DASHBOARD_API_KEY;
        }
    }
});

test('/health and /ping remain open even when DASHBOARD_API_KEY is set', async (t) => {
    const origDatabaseUrl = process.env.DATABASE_URL;
    const origDashboardKey = process.env.DASHBOARD_API_KEY;
    
    process.env.DATABASE_URL = '';
    process.env.DASHBOARD_API_KEY = 'test-secret-123';

    const { startHealthServer } = await import('../src/health-server.js');

    const server = startHealthServer(0);
    await new Promise((resolve) => server.once('listening', resolve));
    const port = server.address().port;

    try {
        const resHealth = await fetchUrl(`http://localhost:${port}/health`);
        assert.equal(resHealth.status, 200);

        const resPing = await fetchUrl(`http://localhost:${port}/ping`);
        assert.equal(resPing.status, 200);
    } finally {
        server.close();
        if (origDatabaseUrl) process.env.DATABASE_URL = origDatabaseUrl;
        if (origDashboardKey) {
            process.env.DASHBOARD_API_KEY = origDashboardKey;
        } else {
            delete process.env.DASHBOARD_API_KEY;
        }
    }
});
