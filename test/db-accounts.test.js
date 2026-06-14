// Set DATABASE_URL to empty first to ensure postgres is disabled at module load time
process.env.DATABASE_URL = '';

import test from 'node:test';
import assert from 'node:assert/strict';

test('getAccounts() strips encryptedCode in lowdb fallback path', async (t) => {
    const { getAccounts } = await import('../src/db.js');
    const accounts = await getAccounts();
    
    if (accounts.length === 0) {
        console.log('  Note: accounts list is empty, gracefully skipping encryptedCode check.');
        t.skip('Skipped because lowdb contains no accounts.');
        return;
    }

    console.log(`  Verifying ${accounts.length} lowdb accounts for security...`);
    for (const acc of accounts) {
        assert.equal('encryptedCode' in acc, false, 'encryptedCode should be stripped from returned account');
        assert.equal('encrypted_code' in acc, false, 'encrypted_code should be stripped from returned account');
    }
});
