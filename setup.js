import fs from 'fs/promises';
import { existsSync } from 'fs';
import readline from 'readline';

const ENV_PATH = '.env';

const askQuestion = (rl, query) => {
    return new Promise(resolve => rl.question(query, resolve));
};

export async function runSetup() {
    // If .env exists and has content, skip setup
    if (existsSync(ENV_PATH)) {
        const content = await fs.readFile(ENV_PATH, 'utf-8');
        if (content.includes('DISCORD_TOKEN=')) {
            console.log('✅ Configuration found. Starting bot...');
            return;
        }
    }

    console.log('\n🔵 --- FIRST TIME SETUP --- 🔵');
    console.log('We need to configure a few things before starting.\n');

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    try {
        const token = await askQuestion(rl, '1. Enter your DISCORD_TOKEN (Required): ');
        if (!token.trim()) {
            console.error('❌ Error: DISCORD_TOKEN is required!');
            process.exit(1);
        }

        const encryptionKey = await askQuestion(rl, '2. Enter an ENCRYPTION_KEY (Optional, press Enter to skip): ');
        const logChannelId = await askQuestion(rl, '3. Enter LOG_CHANNEL_ID (Required for status updates): ');

        // Construct .env content
        let envContent = `DISCORD_TOKEN=${token.trim()}\n`;

        if (encryptionKey.trim()) {
            envContent += `ENCRYPTION_KEY=${encryptionKey.trim()}\n`;
        } else {
            console.log('ℹ️ No encryption key provided. Security will be minimal.');
        }

        if (logChannelId.trim()) {
            envContent += `LOG_CHANNEL_ID=${logChannelId.trim()}\n`;
        }

        // Write to .env
        await fs.writeFile(ENV_PATH, envContent);
        console.log('\n✅ Configuration saved to .env file!');

    } catch (err) {
        console.error('Setup failed:', err);
        process.exit(1);
    } finally {
        rl.close();
    }
}
