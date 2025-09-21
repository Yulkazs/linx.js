const { REST, Routes } = require('discord.js');
require('dotenv').config();

// Import commands
const pingCommand = require('./commands/ping');
const buttonCommand = require('./commands/button');
const menuCommand = require('./commands/menu');
const hybridCommand = require('./commands/hybrid');

// Collect all commands
const commands = [
    pingCommand.data.toJSON(),
    buttonCommand.data.toJSON(),
    menuCommand.data.toJSON(),
    hybridCommand.data.toJSON()
];

// Construct and prepare an instance of the REST module
const rest = new REST().setToken(process.env.DISCORD_TOKEN);

// Deploy commands to specific guild (server) only
(async () => {
    try {
        console.log(`🔄 Started refreshing ${commands.length} application (/) command(s) for guild only.`);

        // Register commands to specific guild (not globally)
        const data = await rest.put(
            Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
            { body: commands },
        );

        console.log(`✅ Successfully reloaded ${data.length} application (/) command(s) for guild ${process.env.GUILD_ID}.`);
        console.log('📝 Registered commands:', data.map(cmd => cmd.name).join(', '));
    } catch (error) {
        console.error('❌ Error deploying commands:', error);
    }
})();