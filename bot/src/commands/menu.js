const { SlashCommandBuilder } = require('discord.js');
const { SelectMenuPaginator } = require('../../../dist/index.js');

// Help sections data
const helpSections = [
  { 
    title: 'Getting Started', 
    content: 'Welcome to our bot! Use `/help` to see this menu, `/ping` to check bot status, and `/info` for server information.' 
  },
  { 
    title: 'Moderation Commands', 
    content: 'Keep your server safe with `/kick`, `/ban`, `/mute`, and `/warn`. All commands support reason logging and duration settings.' 
  },
  { 
    title: 'Fun & Games', 
    content: 'Enjoy interactive features like `/roll` for dice, `/8ball` for magic answers, `/meme` for random memes, and `/quiz` for trivia!' 
  },
  { 
    title: 'Music System', 
    content: 'Play music with `/play`, control playback with `/pause`, `/resume`, `/skip`, and manage queue with `/queue` and `/shuffle`.' 
  },
  { 
    title: 'Server Settings', 
    content: 'Configure the bot using `/settings`. Set welcome messages, moderation channels, auto-roles, and custom prefixes.' 
  },
  { 
    title: 'Troubleshooting', 
    content: 'Having issues? Check bot permissions, verify channel access, and use `/support` to contact our team for help.' 
  }
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Get help with bot features and commands'),

  async execute(interaction) {
    try {
      const paginator = new SelectMenuPaginator(interaction, helpSections, {
        labelOption: 'PageNumbers', // Simple page numbering: "Page 1", "Page 2", etc.
        placeholder: 'Select a page to read...',
        autoDescriptions: true, // Automatically generate descriptions from the data
        descriptionMaxLength: 50, // Limit description length
        pageRenderer: (section, index) => {
          return `📚 **Page ${index + 1}: ${section.title}**\n\n${section.content}`;
        }
      });

      await paginator.start();
      
    } catch (error) {
      console.error('Help command error:', error);
      
      if (interaction.replied || interaction.deferred) {
        await interaction.editReply({
          content: '❌ An error occurred while loading the help menu.',
          ephemeral: true
        });
      } else {
        await interaction.reply({
          content: '❌ An error occurred while loading the help menu.',
          ephemeral: true
        });
      }
    }
  }
};