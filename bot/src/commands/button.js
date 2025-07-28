const { SlashCommandBuilder } = require('discord.js');
const { ButtonPaginator } = require('../../../dist/index.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('button')
        .setDescription('Quick test of ButtonPaginator with simple data'),
    
    async execute(interaction) {
        // Simple test data
        const testData = [
            'Welcome to page 1! 🎉',
            'This is page 2! 📖',
            'You\'re on page 3! ⭐',
            'Page 4 is here! 🚀',
            'Final page - page 5! ✨'
        ];
        
        try {
            // Create a simple ButtonPaginator
            const paginator = new ButtonPaginator(interaction, testData, {
                ephemeral: false,
                timeout: 60000, 
                showPageCounter: true,
                previous: ['Previous', '⬅️'],
                next: ['Next', '➡️'],
                afterTimeout: 'disable',
                first: ['First', '⏪'],
                last: ['Last', '⏩'],
            });
            
            // Start the paginator
            await paginator.start();
            
        } catch (error) {
            console.error('Simple test failed:', error);
            await interaction.reply({
                content: '❌ Test failed! Check console for details.',
                ephemeral: true
            });
        }
    },
};