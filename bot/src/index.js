const { Client, GatewayIntentBits, Collection } = require('discord.js');
require('dotenv').config();

// Create a new client instance
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

// Create a collection to store commands
client.commands = new Collection();

// Import commands
const pingCommand = require('./commands/ping');
client.commands.set(pingCommand.data.name, pingCommand);

const testCommand = require('./commands/test');
client.commands.set(testCommand.data.name, testCommand);

// Import events
const readyEvent = require('./events/ready');
const interactionCreateEvent = require('./events/interactionCreate');

// Register events
client.once('ready', readyEvent.execute);
client.on('interactionCreate', interactionCreateEvent.execute);

// Error handling
client.on('error', error => {
    console.error('Discord client error:', error);
});

process.on('unhandledRejection', error => {
    console.error('Unhandled promise rejection:', error);
});

// Login to Discord
client.login(process.env.DISCORD_TOKEN);