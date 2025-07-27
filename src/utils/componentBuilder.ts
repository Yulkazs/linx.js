/**
 * Utility class for building Discord components
 */

import { 
  ButtonBuilder, 
  ButtonStyle, 
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ActionRowBuilder
} from 'discord.js';

import { DISCORD_LIMITS, VALIDATION } from '../constants/defaults';
import { ValidationUtils } from './validation';
import { ErrorHandler } from './errorHandler';

export interface ButtonOptions {
  customId: string;
  label?: string;
  emoji?: string;
  style?: ButtonStyle;
  disabled?: boolean;
  url?: string;
}

export interface SelectMenuOptions {
  customId: string;
  placeholder?: string;
  minValues?: number;
  maxValues?: number;
  disabled?: boolean;
  options: SelectMenuOptionData[];
}

export interface SelectMenuOptionData {
  label: string;
  value: string;
  description?: string;
  emoji?: string;
  default?: boolean;
}

export class ComponentBuilder {
  
  /**
   * Creates a button component with validation
   */
  static createButton(options: ButtonOptions): ButtonBuilder {
    const button = new ButtonBuilder();

    // Validate and set custom ID (unless it's a link button)
    if (options.style !== ButtonStyle.Link) {
      ValidationUtils.validateCustomId(options.customId);
      button.setCustomId(options.customId);
    }

    // Set style
    const style = options.style ?? ButtonStyle.Primary;
    ValidationUtils.validateButtonStyle(style);
    button.setStyle(style);

    // Set label if provided
    if (options.label) {
      ValidationUtils.validateButtonLabel(options.label);
      button.setLabel(options.label);
    }

    // Set emoji if provided
    if (options.emoji) {
      ValidationUtils.validateEmoji(options.emoji);
      button.setEmoji(options.emoji);
    }

    // Set URL for link buttons
    if (options.url && options.style === ButtonStyle.Link) {
      if (typeof options.url !== 'string' || !this.isValidUrl(options.url)) {
        throw ErrorHandler.validation('button.url', options.url, 'valid URL');
      }
      button.setURL(options.url);
    }

    // Set disabled state
    if (options.disabled) {
      button.setDisabled(true);
    }

    // Validate that button has either label or emoji
    if (!options.label && !options.emoji) {
      throw ErrorHandler.validation('button', 'missing label and emoji', 'label or emoji');
    }

    return button;
  }

  /**
   * Creates a select menu component with validation
   */
  static createSelectMenu(options: SelectMenuOptions): StringSelectMenuBuilder {
    const selectMenu = new StringSelectMenuBuilder();

    // Validate and set custom ID
    ValidationUtils.validateCustomId(options.customId);
    selectMenu.setCustomId(options.customId);

    // Set placeholder if provided
    if (options.placeholder) {
      ValidationUtils.validateSelectPlaceholder(options.placeholder);
      selectMenu.setPlaceholder(options.placeholder);
    }

    // Set min/max values
    const minValues = options.minValues ?? 1;
    const maxValues = options.maxValues ?? 1;
    ValidationUtils.validateSelectValues(minValues, maxValues);
    selectMenu.setMinValues(minValues);
    selectMenu.setMaxValues(maxValues);

    // Set disabled state
    if (options.disabled) {
      selectMenu.setDisabled(true);
    }

    // Validate options array
    if (!Array.isArray(options.options) || options.options.length === 0) {
      throw ErrorHandler.validation('selectMenu.options', options.options, 'non-empty array');
    }

    if (options.options.length > DISCORD_LIMITS.MAX_SELECT_OPTIONS) {
      throw ErrorHandler.validation(
        'selectMenu.options', 
        options.options.length, 
        `array with max length ${DISCORD_LIMITS.MAX_SELECT_OPTIONS}`
      );
    }

    // Create and add options
    const selectOptions = options.options.map(optionData => 
      this.createSelectMenuOption(optionData)
    );

    selectMenu.addOptions(selectOptions);

    return selectMenu;
  }

  /**
   * Creates a select menu option with validation
   */
  static createSelectMenuOption(data: SelectMenuOptionData): StringSelectMenuOptionBuilder {
    const option = new StringSelectMenuOptionBuilder();

    // Validate and set label
    if (typeof data.label !== 'string' || data.label.length === 0) {
      throw ErrorHandler.validation('option.label', data.label, 'non-empty string');
    }

    if (data.label.length > DISCORD_LIMITS.MAX_SELECT_OPTION_LABEL_LENGTH) {
      throw ErrorHandler.validation(
        'option.label', 
        data.label, 
        `string with max length ${DISCORD_LIMITS.MAX_SELECT_OPTION_LABEL_LENGTH}`
      );
    }

    option.setLabel(data.label);

    // Validate and set value
    if (typeof data.value !== 'string' || data.value.length === 0) {
      throw ErrorHandler.validation('option.value', data.value, 'non-empty string');
    }

    if (data.value.length > DISCORD_LIMITS.MAX_SELECT_OPTION_LABEL_LENGTH) {
      throw ErrorHandler.validation(
        'option.value', 
        data.value, 
        `string with max length ${DISCORD_LIMITS.MAX_SELECT_OPTION_LABEL_LENGTH}`
      );
    }

    option.setValue(data.value);

    // Set description if provided
    if (data.description) {
      if (typeof data.description !== 'string') {
        throw ErrorHandler.validation('option.description', data.description, 'string');
      }

      if (data.description.length > DISCORD_LIMITS.MAX_SELECT_OPTION_DESCRIPTION_LENGTH) {
        throw ErrorHandler.validation(
          'option.description', 
          data.description, 
          `string with max length ${DISCORD_LIMITS.MAX_SELECT_OPTION_DESCRIPTION_LENGTH}`
        );
      }

      option.setDescription(data.description);
    }

    // Set emoji if provided
    if (data.emoji) {
      ValidationUtils.validateEmoji(data.emoji);
      option.setEmoji(data.emoji);
    }

    // Set default state
    if (data.default) {
      option.setDefault(true);
    }

    return option;
  }

  /**
   * Creates action rows from components, automatically distributing them
   */
  static createActionRows<T extends ButtonBuilder | StringSelectMenuBuilder>(
    components: T[]
  ): ActionRowBuilder<T>[] {
    if (!Array.isArray(components) || components.length === 0) {
      return [];
    }

    const rows: ActionRowBuilder<T>[] = [];
    let currentRow = new ActionRowBuilder<T>();
    let componentsInCurrentRow = 0;

    for (const component of components) {
      // Check if we need to start a new row
      if (component instanceof StringSelectMenuBuilder) {
        // Select menus take up entire rows
        if (componentsInCurrentRow > 0) {
          rows.push(currentRow);
          currentRow = new ActionRowBuilder<T>();
          componentsInCurrentRow = 0;
        }
        
        currentRow.addComponents(component);
        rows.push(currentRow);
        currentRow = new ActionRowBuilder<T>();
        componentsInCurrentRow = 0;
      } else if (component instanceof ButtonBuilder) {
        // Buttons can share rows (max 5 per row)
        if (componentsInCurrentRow >= DISCORD_LIMITS.MAX_BUTTON_PER_ROW) {
          rows.push(currentRow);
          currentRow = new ActionRowBuilder<T>();
          componentsInCurrentRow = 0;
        }

        currentRow.addComponents(component);
        componentsInCurrentRow++;
      }

      // Check if we've hit the max rows limit
      if (rows.length >= DISCORD_LIMITS.MAX_ROWS_PER_MESSAGE) {
        break;
      }
    }

    // Add the last row if it has components
    if (componentsInCurrentRow > 0) {
      rows.push(currentRow);
    }

    return rows;
  }

  /**
   * Validates component arrays and returns action rows
   */
  static buildComponentRows<T extends ButtonBuilder | StringSelectMenuBuilder>(
    components: T[]
  ): ActionRowBuilder<T>[] {
    if (components.length === 0) {
      return [];
    }

    const rows = this.createActionRows(components);

    if (rows.length > DISCORD_LIMITS.MAX_ROWS_PER_MESSAGE) {
      throw ErrorHandler.validation(
        'components', 
        rows.length, 
        `${DISCORD_LIMITS.MAX_ROWS_PER_MESSAGE} or fewer rows`
      );
    }

    return rows;
  }

  /**
   * Disables all components in an action row
   */
  static disableComponents<T extends ButtonBuilder | StringSelectMenuBuilder>(
    rows: ActionRowBuilder<T>[]
  ): ActionRowBuilder<T>[] {
    return rows.map(row => {
      const newRow = new ActionRowBuilder<T>();
      
      row.components.forEach(component => {
        if (component instanceof ButtonBuilder) {
          const disabledButton = ButtonBuilder.from(component.toJSON()).setDisabled(true);
          newRow.addComponents(disabledButton as T);
        } else if (component instanceof StringSelectMenuBuilder) {
          const disabledSelect = StringSelectMenuBuilder.from(component.toJSON()).setDisabled(true);
          newRow.addComponents(disabledSelect as T);
        }
      });

      return newRow;
    });
  }

  /**
   * Validates URL format
   */
  private static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return url.startsWith('http://') || url.startsWith('https://');
    } catch {
      return false;
    }
  }

  /**
   * Creates navigation buttons for pagination
   */
  static createNavigationButtons(options: {
    currentPage: number;
    totalPages: number;
    style?: ButtonStyle;
    showFirst?: boolean;
    showLast?: boolean;
    showPageCounter?: boolean;
    disableAtEdges?: boolean;
    emojis?: {
      first?: string;
      previous?: string;
      next?: string;
      last?: string;
    };
    labels?: {
      first?: string;
      previous?: string;
      next?: string;
      last?: string;
    };
  }): ButtonBuilder[] {
    const buttons: ButtonBuilder[] = [];
    const { 
      currentPage, 
      totalPages, 
      style = ButtonStyle.Primary,
      showFirst = false,
      showLast = false,
      showPageCounter = false,
      disableAtEdges = true,
      emojis = {},
      labels = {}
    } = options;

    // First button
    if (showFirst) {
      buttons.push(this.createButton({
        customId: 'first',
        label: labels.first,
        emoji: emojis.first,
        style,
        disabled: disableAtEdges && currentPage === 0
      }));
    }

    // Previous button
    buttons.push(this.createButton({
      customId: 'previous',
      label: labels.previous,
      emoji: emojis.previous,
      style,
      disabled: disableAtEdges && currentPage === 0
    }));

    // Page counter button
    if (showPageCounter) {
      buttons.push(this.createButton({
        customId: 'counter',
        label: `${currentPage + 1} / ${totalPages}`,
        style: ButtonStyle.Secondary,
        disabled: true
      }));
    }

    // Next button
    buttons.push(this.createButton({
      customId: 'next',
      label: labels.next,
      emoji: emojis.next,
      style,
      disabled: disableAtEdges && currentPage === totalPages - 1
    }));

    // Last button
    if (showLast) {
      buttons.push(this.createButton({
        customId: 'last',
        label: labels.last,
        emoji: emojis.last,
        style,
        disabled: disableAtEdges && currentPage === totalPages - 1
      }));
    }

    return buttons;
  }
}