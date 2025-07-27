module.exports = {
    name: 'ready',
    once: true,
    execute(client) {
        console.log(`✅ Bot is ready! Logged in as ${client.user.tag}`);
        console.log(`📊 Serving ${client.guilds.cache.size} guild(s)`);
        console.log(`👥 Connected to ${client.users.cache.size} user(s)`);
        
        // Set bot status
        client.user.setPresence({
            activities: [{
                name: 'Testing linx.js pagination',
                type: 0, // PLAYING
            }],
            status: 'online',
        });
        
        console.log('🎯 Bot status set successfully');
    },
};