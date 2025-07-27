const { SlashCommandBuilder } = require('discord.js');
const { ButtonPaginator } = require('../../../dist/index.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('test')
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
                showPageCounter: false,
                previousEmoji: '<:linx_prev:1398768319279927457>',
                nextEmoji: '<:linx_next:1398768007861370911>',
                firstEmoji: '<:linx_first:1398768007861370911>',
                lastEmoji: '<:linx_last:1398768007861370911>',
                disableOnTimeout: true, // Disable buttons after timeout
                customId: 'test_paginator', // Custom ID for the paginator
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