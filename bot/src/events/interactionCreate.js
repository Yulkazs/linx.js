module.exports = {
    name: 'interactionCreate',
    async execute(interaction) {
        // Handle slash commands
        if (interaction.isChatInputCommand()) {
            const command = interaction.client.commands.get(interaction.commandName);

            if (!command) {
                console.error(`❌ No command matching ${interaction.commandName} was found.`);
                return;
            }

            try {
                console.log(`🔧 Executing command: ${interaction.commandName} by ${interaction.user.tag}`);
                await command.execute(interaction);
            } catch (error) {
                console.error('❌ Error executing command:', error);
                
                const errorMessage = {
                    content: '❌ There was an error while executing this command!',
                    ephemeral: true
                };

                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp(errorMessage);
                } else {
                    await interaction.reply(errorMessage);
                }
            }
        }
        
        // Handle button interactions (for future linx.js testing)
        if (interaction.isButton()) {
            console.log(`🔘 Button interaction: ${interaction.customId} by ${interaction.user.tag}`);
        }
        
        // Handle select menu interactions (for future linx.js testing)
        if (interaction.isStringSelectMenu()) {
            console.log(`📋 Select menu interaction: ${interaction.customId} by ${interaction.user.tag}`);
        }
    },
};