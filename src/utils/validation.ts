/**
 * Validation utilities for linx.js
 * Fixed: Added support for Discord custom emojis
 */

import { EmbedBuilder, ButtonStyle } from 'discord.js';
import { DISCORD_LIMITS, VALIDATION } from '../constants/defaults';
import { ErrorHandler, LinxValidationError } from './errorHandler';
import { 
  PaginationData, 
  PageRenderer, 
  ButtonPaginationOptions,
  SelectMenuPaginationOptions,
  HybridPaginationOptions,
  LinxInteraction,
  ButtonConfig,
  AfterTimeoutBehavior
} from '../types';

export class ValidationUtils {

  // Validates pagination data  
  static validatePaginationData<T>(data: PaginationData<T>): void {
    if (!Array.isArray(data)) {
      throw ErrorHandler.validation('data', data, 'array');
    }

    if (data.length === 0) {
      throw new LinxValidationError('data', data, 'non-empty array');
    }
  }

  //Validates page renderer function
  static validatePageRenderer<T>(renderer: PageRenderer<T>): void {
    if (typeof renderer !== 'function') {
      throw ErrorHandler.validation('pageRenderer', renderer, 'function');
    }
  }

  // Validates page number
  static validatePageNumber(page: number, totalPages: number): void {
    if (!Number.isInteger(page)) {
      throw ErrorHandler.validation('page', page, 'integer');
    }

    if (page < 0 || page >= totalPages) {
      throw ErrorHandler.validation('page', page, `number between 0 and ${totalPages - 1}`);
    }
  }

  // Validates timeout value
  static validateTimeout(timeout: number): void {
    if (typeof timeout !== 'number' || timeout < 0) {
      throw ErrorHandler.validation('timeout', timeout, 'positive number');
    }

    if (timeout > DISCORD_LIMITS.INTERACTION_TOKEN_LIFETIME) {
      throw ErrorHandler.validation(
        'timeout', 
        timeout, 
        `number less than ${DISCORD_LIMITS.INTERACTION_TOKEN_LIFETIME}ms (Discord interaction token lifetime)`
      );
    }
  }

  // Validates afterTimeout behavior
  static validateAfterTimeoutBehavior(behavior: AfterTimeoutBehavior): void {
    const validBehaviors: AfterTimeoutBehavior[] = ['delete', 'disable'];
    if (!validBehaviors.includes(behavior)) {
      throw ErrorHandler.validation('afterTimeout', behavior, `one of: ${validBehaviors.join(', ')}`);
    }
  }

  // Validates button style
  static validateButtonStyle(style: ButtonStyle): void {
    const validStyles = Object.values(ButtonStyle).filter(val => typeof val === 'number');
    if (!validStyles.includes(style)) {
      throw ErrorHandler.validation('buttonStyle', style, `one of: ${validStyles.join(', ')}`);
    }
  }

  // Validates button label
  static validateButtonLabel(label: string): void {
    if (typeof label !== 'string') {
      throw ErrorHandler.validation('buttonLabel', label, 'string');
    }

    if (label.length === 0) {
      throw ErrorHandler.validation('buttonLabel', label, 'non-empty string');
    }

    if (label.length > DISCORD_LIMITS.MAX_BUTTON_LABEL_LENGTH) {
      throw ErrorHandler.validation(
        'buttonLabel', 
        label, 
        `string with max length ${DISCORD_LIMITS.MAX_BUTTON_LABEL_LENGTH}`
      );
    }
  }

  // Validates emoji format (Unicode emojis only)
  static validateEmoji(emoji: string): void {
    if (typeof emoji !== 'string') {
      throw ErrorHandler.validation('emoji', emoji, 'string');
    }

    if (!VALIDATION.EMOJI_PATTERN.test(emoji) && !VALIDATION.DISCORD_EMOJI_PATTERN.test(emoji)) {
      throw ErrorHandler.validation('emoji', emoji, 'valid Discord emoji format (Unicode or custom <:name:id>)');
    }
  }

  // Checks if a string is a Unicode emoji (more lenient approach)
  static isEmoji(str: string): boolean {
    if (typeof str !== 'string' || str.length === 0) return false;
    
    // Very lenient approach - check common emoji ranges and specific characters
    // This covers most emoji including arrows, symbols, and emojis with variation selectors
    return /[\u{1F000}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F100}-\u{1F1FF}]|[\u{2190}-\u{21FF}]|[\u{25A0}-\u{25FF}]|[\u{2B00}-\u{2BFF}]|[\u{23E9}-\u{23EF}]|[\u{23F0}-\u{23F3}]|[\u{23F8}-\u{23FA}]|[\u{FE0F}]/u.test(str) || 
           // Also accept common arrow and navigation emojis specifically
           ['⬅️', '➡️', '⏪', '⏩', '◀️', '▶️', '⬅', '➡', '⏪', '⏩', '◀', '▶'].includes(str);
  }

  // Checks if a string is a custom Discord emoji
  static isCustomEmoji(str: string): boolean {
    if (typeof str !== 'string') return false;
    return VALIDATION.DISCORD_EMOJI_PATTERN.test(str);
  }

  // Checks if a string is any valid emoji (Unicode or custom)
  static isAnyEmoji(str: string): boolean {
    return this.isEmoji(str) || this.isCustomEmoji(str);
  }

  // Validates button configuration
  static validateButtonConfig(config: ButtonConfig, configName: string): void {
    if (typeof config === 'string') {
      // Single string - validate as either label or emoji
      if (config.length === 0) {
        throw ErrorHandler.validation(configName, config, 'non-empty string');
      }
      
      if (!this.isAnyEmoji(config)) {
        // Validate as label if it's not an emoji
        this.validateButtonLabel(config);
      }
    } else if (Array.isArray(config)) {
      if (config.length < 1 || config.length > 2) {
        throw ErrorHandler.validation(configName, config, 'array with 1 or 2 elements');
      }
      
      // Validate each element
      config.forEach((item, index) => {
        if (typeof item !== 'string' || item.length === 0) {
          throw ErrorHandler.validation(`${configName}[${index}]`, item, 'non-empty string');
        }
        
        if (index === 0) {
          // First element - validate as label or emoji
          if (!this.isAnyEmoji(item)) {
            this.validateButtonLabel(item);
          }
        } else if (index === 1) {
          // Second element should be emoji (Unicode or custom)
          if (!this.isAnyEmoji(item)) {
            throw ErrorHandler.validation(`${configName}[${index}]`, item, 'valid emoji (Unicode or Discord custom)');
          }
        }
      });
    } else {
      throw ErrorHandler.validation(configName, config, 'string or array');
    }
  }

  // Validates custom ID format
  static validateCustomId(customId: string): void {
    if (typeof customId !== 'string') {
      throw ErrorHandler.validation('customId', customId, 'string');
    }

    if (!VALIDATION.CUSTOM_ID_PATTERN.test(customId)) {
      throw ErrorHandler.validation(
        'customId', 
        customId, 
        'string with alphanumeric characters, underscores, and hyphens (max 100 chars)'
      );
    }
  }

  // Validates select menu placeholder
  static validateSelectPlaceholder(placeholder: string): void {
    if (typeof placeholder !== 'string') {
      throw ErrorHandler.validation('placeholder', placeholder, 'string');
    }

    if (placeholder.length > DISCORD_LIMITS.MAX_SELECT_PLACEHOLDER_LENGTH) {
      throw ErrorHandler.validation(
        'placeholder', 
        placeholder, 
        `string with max length ${DISCORD_LIMITS.MAX_SELECT_PLACEHOLDER_LENGTH}`
      );
    }
  }

  // Validates select menu values  
  static validateSelectValues(minValues: number, maxValues: number): void {
    if (!Number.isInteger(minValues) || minValues < 1) {
      throw ErrorHandler.validation('minValues', minValues, 'positive integer');
    }

    if (!Number.isInteger(maxValues) || maxValues < minValues) {
      throw ErrorHandler.validation('maxValues', maxValues, `integer >= ${minValues}`);
    }

    if (maxValues > DISCORD_LIMITS.MAX_SELECT_OPTIONS) {
      throw ErrorHandler.validation(
        'maxValues', 
        maxValues, 
        `integer <= ${DISCORD_LIMITS.MAX_SELECT_OPTIONS}`
      );
    }
  }

  // Validates embed structure
  static validateEmbed(embed: EmbedBuilder): void {
    const embedData = embed.toJSON();

    if (embedData.title && embedData.title.length > DISCORD_LIMITS.MAX_EMBED_TITLE_LENGTH) {
      throw ErrorHandler.validation(
        'embed.title', 
        embedData.title, 
        `string with max length ${DISCORD_LIMITS.MAX_EMBED_TITLE_LENGTH}`
      );
    }

    if (embedData.description && embedData.description.length > DISCORD_LIMITS.MAX_EMBED_DESCRIPTION_LENGTH) {
      throw ErrorHandler.validation(
        'embed.description', 
        embedData.description, 
        `string with max length ${DISCORD_LIMITS.MAX_EMBED_DESCRIPTION_LENGTH}`
      );
    }

    if (embedData.fields) {
      embedData.fields.forEach((field, index) => {
        if (field.name.length > DISCORD_LIMITS.MAX_EMBED_FIELD_NAME_LENGTH) {
          throw ErrorHandler.validation(
            `embed.fields[${index}].name`, 
            field.name, 
            `string with max length ${DISCORD_LIMITS.MAX_EMBED_FIELD_NAME_LENGTH}`
          );
        }

        if (field.value.length > DISCORD_LIMITS.MAX_EMBED_FIELD_VALUE_LENGTH) {
          throw ErrorHandler.validation(
            `embed.fields[${index}].value`, 
            field.value, 
            `string with max length ${DISCORD_LIMITS.MAX_EMBED_FIELD_VALUE_LENGTH}`
          );
        }
      });
    }

    const totalLength = JSON.stringify(embedData).length;
    if (totalLength > DISCORD_LIMITS.MAX_EMBED_TOTAL_LENGTH) {
      throw ErrorHandler.validation(
        'embed', 
        totalLength, 
        `embed with total length <= ${DISCORD_LIMITS.MAX_EMBED_TOTAL_LENGTH}`
      );
    }
  }

  // Validates message content
  static validateMessageContent(content: string): void {
    if (typeof content !== 'string') {
      throw ErrorHandler.validation('messageContent', content, 'string');
    }

    if (content.length > DISCORD_LIMITS.MAX_MESSAGE_CONTENT_LENGTH) {
      throw ErrorHandler.validation(
        'messageContent', 
        content, 
        `string with max length ${DISCORD_LIMITS.MAX_MESSAGE_CONTENT_LENGTH}`
      );
    }
  }

  // Validates interaction
  static validateInteraction(interaction: LinxInteraction): void {
    if (!interaction) {
      throw ErrorHandler.validation('interaction', interaction, 'valid Discord interaction');
    }

    if (!interaction.isRepliable()) {
      throw ErrorHandler.validation('interaction', interaction, 'repliable interaction');
    }
  }

  // Validates button options with new API
  static validateButtonOptions<T>(options: ButtonPaginationOptions<T>): void {
    if (options.timeout !== undefined) {
      this.validateTimeout(options.timeout);
    }

    if (options.afterTimeout !== undefined) {
      this.validateAfterTimeoutBehavior(options.afterTimeout);
    }

    if (options.buttonStyle !== undefined) {
      this.validateButtonStyle(options.buttonStyle);
    }

    if (options.previous !== undefined) {
      this.validateButtonConfig(options.previous, 'previous');
    }

    if (options.next !== undefined) {
      this.validateButtonConfig(options.next, 'next');
    }

    if (options.first !== undefined) {
      this.validateButtonConfig(options.first, 'first');
    }

    if (options.last !== undefined) {
      this.validateButtonConfig(options.last, 'last');
    }

    if (options.startPage !== undefined) {
      if (!Number.isInteger(options.startPage) || options.startPage < 0) {
        throw ErrorHandler.validation('startPage', options.startPage, 'non-negative integer');
      }
    }

    if (options.showPageCounter !== undefined && typeof options.showPageCounter !== 'boolean') {
      throw ErrorHandler.validation('showPageCounter', options.showPageCounter, 'boolean');
    }

    if (options.showFirstLast !== undefined && typeof options.showFirstLast !== 'boolean') {
      throw ErrorHandler.validation('showFirstLast', options.showFirstLast, 'boolean');
    }
  }

  // Validates select menu options
  static validateSelectMenuOptions<T>(options: SelectMenuPaginationOptions<T>): void {
    if (options.timeout !== undefined) {
      this.validateTimeout(options.timeout);
    }

    if (options.afterTimeout !== undefined) {
      this.validateAfterTimeoutBehavior(options.afterTimeout);
    }

    if (options.placeholder !== undefined) {
      this.validateSelectPlaceholder(options.placeholder);
    }

    if (options.customId !== undefined) {
      this.validateCustomId(options.customId);
    }

    if (options.minValues !== undefined && options.maxValues !== undefined) {
      this.validateSelectValues(options.minValues, options.maxValues);
    }

    if (options.maxOptionsPerMenu !== undefined) {
      if (!Number.isInteger(options.maxOptionsPerMenu) || options.maxOptionsPerMenu < 1) {
        throw ErrorHandler.validation('maxOptionsPerMenu', options.maxOptionsPerMenu, 'positive integer');
      }

      if (options.maxOptionsPerMenu > DISCORD_LIMITS.MAX_SELECT_OPTIONS) {
        throw ErrorHandler.validation(
          'maxOptionsPerMenu', 
          options.maxOptionsPerMenu, 
          `integer <= ${DISCORD_LIMITS.MAX_SELECT_OPTIONS}`
        );
      }
    }

    if (options.startPage !== undefined) {
      if (!Number.isInteger(options.startPage) || options.startPage < 0) {
        throw ErrorHandler.validation('startPage', options.startPage, 'non-negative integer');
      }
    }
  }

  // Validates hybrid paginator options
  static validateHybridOptions<T>(options: HybridPaginationOptions<T>): void {
    if (options.timeout !== undefined) {
      this.validateTimeout(options.timeout);
    }

    if (options.afterTimeout !== undefined) {
      this.validateAfterTimeoutBehavior(options.afterTimeout);
    }

    if (options.layout !== undefined) {
      const validLayouts = ['buttons-top', 'buttons-bottom', 'select-top', 'select-bottom'];
      if (!validLayouts.includes(options.layout)) {
        throw ErrorHandler.validation('layout', options.layout, `one of: ${validLayouts.join(', ')}`);
      }
    }

    if (options.buttonOptions) {
      this.validateButtonOptions(options.buttonOptions as ButtonPaginationOptions<T>);
    }

    if (options.selectMenuOptions) {
      this.validateSelectMenuOptions(options.selectMenuOptions as SelectMenuPaginationOptions<T>);
    }

    if (options.startPage !== undefined) {
      if (!Number.isInteger(options.startPage) || options.startPage < 0) {
        throw ErrorHandler.validation('startPage', options.startPage, 'non-negative integer');
      }
    }
  }
}