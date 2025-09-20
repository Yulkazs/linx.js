const { SlashCommandBuilder } = require('discord.js');
const { SelectMenuPaginator } = require('../../../dist/index.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('menu')
        .setDescription('Test SelectMenuPaginator with three distinct labeling approaches')
        .addStringOption(option =>
            option.setName('style')
                .setDescription('Choose the labeling approach for menu options')
                .setRequired(false)
                .addChoices(
                    { name: 'Page Numbers (Page 1, Page 2...)', value: 'pages' },
                    { name: 'Custom Numbers (Chapter 1, Level 1...)', value: 'custom-numbers' },
                    { name: 'Custom Labels (fully custom with emojis)', value: 'custom-labels' }
                ))
        .addStringOption(option =>
            option.setName('prefix')
                .setDescription('Custom word before the number (only for Custom Numbers style)')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('suffix')
                .setDescription('Optional text after the number (only for Custom Numbers style)')
                .setRequired(false)),
    
    async execute(interaction) {
        const labelStyle = interaction.options.getString('style') || 'pages';
        const customPrefix = interaction.options.getString('prefix');
        const customSuffix = interaction.options.getString('suffix');
        
        // Sample data for demonstration
        const testData = [
            'Welcome to the first section! This introduces the basic concepts and fundamentals.',
            'Here we dive deeper into advanced features and functionality for power users.',
            'Troubleshooting common issues and frequently asked questions from the community.',
            'Best practices and tips from experienced users to optimize your workflow.',
            'API documentation and developer resources for integration and customization.',
            'Conclusion and next steps for your learning journey and continued growth.'
        ];
        
        try {
            // Base options that apply to all approaches
            let options = {
                placeholder: 'Choose a section to read...',
                ephemeral: false,
                timeout: 60000,
                afterTimeout: 'disable',
                autoDescriptions: true,
                descriptionMaxLength: 60
            };
            
            // Configure based on user's choice - using only ONE approach at a time
            switch (labelStyle) {
                case 'pages':
                    // APPROACH 1: Page Numbers
                    // This is the simplest approach - just shows "Page 1", "Page 2", etc.
                    options.labelStyle = 'page-numbers';
                    
                    // Warn if user provided prefix/suffix for page numbers (they won't be used)
                    if (customPrefix || customSuffix) {
                        await interaction.reply({
                            content: '⚠️ Custom prefix/suffix are ignored when using Page Numbers style. Use "Custom Numbers" style instead.',
                            ephemeral: true
                        });
                        return;
                    }
                    break;
                    
                case 'custom-numbers':
                    // APPROACH 2: Custom Numbers with Prefix
                    // Shows "Chapter 1", "Level 1", etc. with optional suffix
                    options.labelStyle = 'custom-numbers';
                    options.customPrefix = customPrefix || 'Section'; // Default to "Section" if no prefix provided
                    
                    if (customSuffix) {
                        options.customSuffix = customSuffix;
                    }
                    
                    // Validate that prefix is provided for custom numbers
                    if (!customPrefix) {
                        await interaction.reply({
                            content: '💡 No prefix provided, using default "Section". Try using the `prefix` option for custom prefixes like "Chapter", "Level", "Step", etc.',
                            ephemeral: true
                        });
                        // Continue execution with default
                    }
                    break;
                    
                case 'custom-labels':
                    // APPROACH 3: Fully Custom Labels
                    // Complete control over labels and descriptions using functions
                    
                    // Warn if user provided prefix/suffix for custom labels (they won't be used)
                    if (customPrefix || customSuffix) {
                        await interaction.reply({
                            content: '⚠️ Custom prefix/suffix are ignored when using Custom Labels style. Labels are fully controlled by the custom function.',
                            ephemeral: true
                        });
                        return;
                    }
                    
                    // Custom label renderer with emojis and creative formatting
                    options.optionLabelRenderer = (item, index) => {
                        const sectionNames = [
                            '📚 Getting Started', 
                            '⚡ Advanced Features', 
                            '🔧 Troubleshooting', 
                            '✨ Best Practices', 
                            '📖 API Reference', 
                            '🎯 What\'s Next'
                        ];
                        return sectionNames[index] || `📄 Section ${index + 1}`;
                    };
                    
                    // Custom description renderer for more detailed previews
                    options.optionDescriptionRenderer = (item, index) => {
                        // Create custom descriptions based on content
                        const descriptions = [
                            'Learn the fundamentals and core concepts',
                            'Explore powerful features for advanced users', 
                            'Solve common problems and get help',
                            'Tips and tricks from the community',
                            'Technical documentation for developers',
                            'Continue your journey and next steps'
                        ];
                        return descriptions[index] || item.substring(0, 50) + '...';
                    };
                    break;
                    
                default:
                    // Fallback to page numbers if somehow an invalid option gets through
                    options.labelStyle = 'page-numbers';
                    break;
            }
            
            // Create the paginator with the configured options
            const paginator = new SelectMenuPaginator(interaction, testData, options);
            
            // Add event logging to demonstrate the different approaches
            paginator.on('start', (initialPage) => {
                const styleInfo = paginator.getLabelingSystemInfo();
                let logMessage = `📋 Menu started with style: ${styleInfo.style}`;
                
                if (styleInfo.prefix) {
                    logMessage += `, prefix: "${styleInfo.prefix}"`;
                }
                if (styleInfo.suffix) {
                    logMessage += `, suffix: "${styleInfo.suffix}"`;
                }
                if (styleInfo.isCustomRenderer) {
                    logMessage += ' (using custom renderer functions)';
                }
                
                console.log(logMessage);
            });
            
            paginator.on('pageChange', (newPage, oldPage) => {
                console.log(`📋 Page changed from ${oldPage + 1} to ${newPage + 1}`);
            });
            
            paginator.on('error', (error) => {
                console.error('📋 Paginator error:', error.message);
            });
            
            await paginator.start();
            
        } catch (error) {
            console.error('Menu test failed:', error);
            
            // Provide helpful error messages for common issues
            let errorMessage = '❌ Menu test failed!';
            
            if (error.name === 'LinxValidationError') {
                if (error.message.includes('customPrefix')) {
                    errorMessage += ' Custom prefix is required when using custom-numbers style.';
                } else if (error.message.includes('labelStyle')) {
                    errorMessage += ' Invalid label style configuration.';
                } else {
                    errorMessage += ` Validation error: ${error.message}`;
                }
            } else {
                errorMessage += ` Error: ${error.message}`;
            }
            
            // Send error response if we haven't replied yet
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: errorMessage,
                    ephemeral: true
                });
            } else {
                await interaction.editReply({
                    content: errorMessage
                });
            }
        }
    },

    // Helper method to demonstrate proper usage patterns
    getUsageExamples() {
        return {
            pageNumbers: {
                description: 'Simple page numbering',
                code: `
                const paginator = new SelectMenuPaginator(interaction, data, {
                    labelStyle: 'page-numbers',
                    placeholder: 'Select a page...'
                });
                `
            },
            customNumbers: {
                description: 'Custom numbering with prefix',
                code: `
                const paginator = new SelectMenuPaginator(interaction, data, {
                    labelStyle: 'custom-numbers',
                    customPrefix: 'Chapter',
                    customSuffix: '- Introduction', // optional
                    placeholder: 'Select a chapter...'
                });
                `
            },
            customLabels: {
                description: 'Fully custom labels with complete control',
                code: `
                const paginator = new SelectMenuPaginator(interaction, data, {
                    optionLabelRenderer: (item, index) => {
                        return \`🎯 Step \${index + 1}: \${item.title}\`;
                    },
                    optionDescriptionRenderer: (item, index) => {
                        return item.description || 'No description available';
                    },
                    placeholder: 'Select a step...'
                });
                `
            }
        };
    }
};