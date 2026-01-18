
import { sendLog, startBot } from './bot.js';
import { getLogChannel } from './db.js';

console.log('🧪 Starting Diagnostic Test (Timeout Method)...');

// Start the bot (logs in)
startBot();

// Wait 5 seconds for login
setTimeout(async () => {
    console.log('⏳ Waited 5s for login...');

    console.log('🔍 Checking Log Channel from DB...');
    const dbChannel = await getLogChannel();
    console.log(`📂 DB Log Channel ID: ${dbChannel}`);

    console.log('🚀 Attempting to send test log...');
    try {
        await sendLog('🧪 **Diagnostic Test**: If you see this, logging is working! (Channel ID: ' + dbChannel + ')', 'start');
        console.log('✅ Test log function called (check console for [DEBUG] lines and Discord for message)');
    } catch (error) {
        console.error('❌ Test log FAILED:', error);
    }

    // Keep alive briefly to allow send to complete
    setTimeout(() => {
        console.log('🏁 Diagnostic complete. Exiting...');
        process.exit(0);
    }, 5000);

}, 5000);
