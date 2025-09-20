const { SlashCommandBuilder } = require('discord.js');
const { SelectMenuPaginator } = require('../../../dist/index.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('menu')
        .setDescription('Test SelectMenuPaginator with dropdown navigation')
        .addStringOption(option =>
            option.setName('style')
                .setDescription('How to label the menu options')
                .setRequired(false)
                .addChoices(
                    { name: 'Page Numbers (Page 1, Page 2...)', value: 'pages' },
                    { name: 'Custom Numbers (Chapter 1, Chapter 2...)', value: 'custom-numbers' },
                    { name: 'Custom Labels (fully custom)', value: 'custom-labels' }
                ))
        .addStringOption(option =>
            option.setName('prefix')
                .setDescription('Custom word before the number (e.g., "Chapter", "Step", "Level")')
                .setRequired(false)),
    
    async execute(interaction) {
        const labelStyle = interaction.options.getString('style') || 'pages';
        const customPrefix = interaction.options.getString('prefix') || '';
        
        // Sample data
        const testData = [
            'Welcome to the first section! This introduces the basic concepts.',
            'Here we dive deeper into advanced features and functionality.',
            'Troubleshooting common issues and frequently asked questions.',
            'Best practices and tips from experienced users in the community.',
            'API documentation and developer resources for integration.',
            'Conclusion and next steps for your learning journey.'
        ];
        
        try {
            let options = {
                placeholder: 'Choose a section to read...',
                ephemeral: false,
                timeout: 60000,
                afterTimeout: 'disable'
            };
            
            // Configure based on user's choice
            switch (labelStyle) {
                case 'pages':
                    // Page Numbers: "Page 1, Page 2, Page 3"
                    options.labelStyle = 'page-numbers';
                    options.autoDescriptions = true;
                    options.descriptionMaxLength = 60;
                    break;
                    
                case 'custom-numbers':
                    // Custom Numbers: "Chapter 1, Step 1, Level 1", etc.
                    options.labelStyle = 'custom-numbers';
                    options.customPrefix = customPrefix || 'Section'; // Default to "Section" if no prefix provided
                    options.autoDescriptions = true;
                    options.descriptionMaxLength = 60;
                    break;
                    
                case 'custom-labels':
                    // Custom Labels: Fully custom using optionLabelRenderer
                    options.labelStyle = 'custom-labels';
                    options.optionLabelRenderer = (item, index) => {
                        const sectionNames = [
                            '📚 Introduction', 
                            '⚡ Advanced Features', 
                            '🔧 Troubleshooting', 
                            '✨ Best Practices', 
                            '📖 API Documentation', 
                            '🎯 Conclusion'
                        ];
                        return sectionNames[index] || `📄 Section ${index + 1}`;
                    };
                    options.optionDescriptionRenderer = (item, index) => {
                        return item.length > 50 ? `${item.substring(0, 47)}...` : item;
                    };
                    break;
            }
            
            // Create the paginator
            const paginator = new SelectMenuPaginator(interaction, testData, options);
            
            // Add some event logging
            paginator.on('start', (initialPage) => {
                console.log(`📋 Menu started with style: ${labelStyle}${customPrefix ? `, prefix: "${customPrefix}"` : ''}`);
            });
            
            paginator.on('pageChange', (newPage, oldPage) => {
                console.log(`📋 Changed from ${oldPage + 1} to ${newPage + 1}`);
            });
            
            await paginator.start();
            
        } catch (error) {
            console.error('Menu test failed:', error);
            await interaction.reply({
                content: `❌ Menu test failed! Error: ${error.message}`,
                ephemeral: true
            });
        }
    },
};