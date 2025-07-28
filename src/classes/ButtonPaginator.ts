/**
 * Button-based paginator implementation with new cleaner API
 */

import { 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle,
  ButtonInteraction 
} from 'discord.js';

import { BasePaginator } from './BasePaginator';
import { 
  LinxInteraction, 
  PaginationData, 
  ButtonPaginationOptions,
  ButtonConfig 
} from '../types';
import { getLinxConfig } from '../config';
import { DEFAULT_BUTTONS, CUSTOM_IDS } from '../constants/defaults';
import { ValidationUtils } from '../utils/validation';
import { ErrorHandler } from '../utils/errorHandler';

interface ParsedButtonConfig {
  label: string;
  emoji: string;
}

export class ButtonPaginator<T = any> extends BasePaginator<T> {
  private buttonOptions: Required<ButtonPaginationOptions<T>>;

  constructor(
    interaction: LinxInteraction,
    data: PaginationData<T>,
    options: ButtonPaginationOptions<T> = {}
  ) {
    super(interaction, data, options);
    ValidationUtils.validateButtonOptions(options);

    const config = getLinxConfig();

    this.buttonOptions = {
      ...this.options,
      previous: options.previous ?? DEFAULT_BUTTONS.PREVIOUS_LABEL,
      next: options.next ?? DEFAULT_BUTTONS.NEXT_LABEL,
      first: options.first ?? DEFAULT_BUTTONS.FIRST_LABEL,
      last: options.last ?? DEFAULT_BUTTONS.LAST_LABEL,
      buttonStyle: options.buttonStyle ?? config.defaults.buttonStyle,
      showPageCounter: options.showPageCounter ?? config.defaults.showPageCounter
    };
  }

  /**
   * Parses button configuration into label and emoji
   */
  private parseButtonConfig(config: ButtonConfig, defaultLabel: string, defaultEmoji: string): ParsedButtonConfig {
    if (typeof config === 'string') {
      // Single string - could be label or emoji
      if (ValidationUtils.isEmoji(config)) {
        return { label: defaultLabel, emoji: config };
      } else {
        return { label: config, emoji: defaultEmoji };
      }
    } else if (Array.isArray(config)) {
      if (config.length === 1) {
        // Single element array
        const value = config[0];
        if (ValidationUtils.isEmoji(value)) {
          return { label: defaultLabel, emoji: value };
        } else {
          return { label: value, emoji: defaultEmoji };
        }
      } else if (config.length === 2) {
        // Two element array [label, emoji]
        return { label: config[0], emoji: config[1] };
      }
    }
    
    // Fallback to defaults
    return { label: defaultLabel, emoji: defaultEmoji };
  }

  protected buildComponents(): ActionRowBuilder<ButtonBuilder>[] {
    const row = new ActionRowBuilder<ButtonBuilder>();

    // Parse button configurations
    const previousConfig = this.parseButtonConfig(
      this.buttonOptions.previous, 
      DEFAULT_BUTTONS.PREVIOUS_LABEL, 
      DEFAULT_BUTTONS.PREVIOUS_EMOJI
    );

    const nextConfig = this.parseButtonConfig(
      this.buttonOptions.next, 
      DEFAULT_BUTTONS.NEXT_LABEL, 
      DEFAULT_BUTTONS.NEXT_EMOJI
    );

    // Previous button
    const previousButton = new ButtonBuilder()
      .setCustomId(CUSTOM_IDS.BUTTON_PREVIOUS)
      .setStyle(this.buttonOptions.buttonStyle)
      .setLabel(previousConfig.label)
      .setEmoji(previousConfig.emoji)
      .setDisabled(!this.hasPreviousPage());

    // Page counter button (if enabled)
    let pageCounterButton: ButtonBuilder | null = null;
    if (this.buttonOptions.showPageCounter) {
      pageCounterButton = new ButtonBuilder()
        .setCustomId(`linx_counter_${Date.now()}`)
        .setLabel(`${this.state.currentPage + 1} / ${this.state.totalPages}`)
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true);
    }

    // Next button
    const nextButton = new ButtonBuilder()
      .setCustomId(CUSTOM_IDS.BUTTON_NEXT)
      .setStyle(this.buttonOptions.buttonStyle)
      .setLabel(nextConfig.label)
      .setEmoji(nextConfig.emoji)
      .setDisabled(!this.hasNextPage());

    // Add buttons to row
    if (pageCounterButton) {
      row.addComponents(previousButton, pageCounterButton, nextButton);
    } else {
      row.addComponents(previousButton, nextButton);
    }

    return [row];
  }

  protected async handleComponentInteraction(componentInteraction: ButtonInteraction): Promise<void> {
    // Check if the interaction is from the original user
    if (componentInteraction.user.id !== this.interaction.user.id) {
      await componentInteraction.reply({
        content: 'You cannot use this pagination.',
        ephemeral: true
      });
      return;
    }

    // Acknowledge the interaction
    await componentInteraction.deferUpdate();

    try {
      switch (componentInteraction.customId) {
        case CUSTOM_IDS.BUTTON_PREVIOUS:
          if (this.hasPreviousPage()) {
            await this.previousPage();
          }
          break;

        case CUSTOM_IDS.BUTTON_NEXT:
          if (this.hasNextPage()) {
            await this.nextPage();
          }
          break;

        case CUSTOM_IDS.BUTTON_FIRST:
          if (this.hasPreviousPage()) {
            await this.firstPage();
          }
          break;

        case CUSTOM_IDS.BUTTON_LAST:
          if (this.hasNextPage()) {
            await this.lastPage();
          }
          break;

        default:
          // Ignore page counter and other buttons
          if (!componentInteraction.customId.startsWith('linx_counter_')) {
            this.emit('error', ErrorHandler.component(
              'Button', 
              `Unknown button interaction: ${componentInteraction.customId}`
            ));
          }
          break;
      }
    } catch (error) {
      this.emit('error', ErrorHandler.handle(error as Error));
    }
  }

  // Updates button options dynamically
  updateButtonOptions(newOptions: Partial<ButtonPaginationOptions<T>>): void {
    if (!this.state.isActive) {
      throw ErrorHandler.validation('paginator', 'inactive', 'active paginator');
    }

    // Validate new options
    ValidationUtils.validateButtonOptions(newOptions);

    // Update options
    if (newOptions.previous !== undefined) {
      this.buttonOptions.previous = newOptions.previous;
    }
    if (newOptions.next !== undefined) {
      this.buttonOptions.next = newOptions.next;
    }
    if (newOptions.first !== undefined) {
      this.buttonOptions.first = newOptions.first;
    }
    if (newOptions.last !== undefined) {
      this.buttonOptions.last = newOptions.last;
    }
    if (newOptions.buttonStyle !== undefined) {
      this.buttonOptions.buttonStyle = newOptions.buttonStyle;
    }
    if (newOptions.showPageCounter !== undefined) {
      this.buttonOptions.showPageCounter = newOptions.showPageCounter;
    }

    // Update the message with new components
    this.updateMessage().catch(error => {
      this.emit('error', ErrorHandler.handle(error));
    });
  }

  // Gets current button options
  getButtonOptions(): Readonly<Required<ButtonPaginationOptions<T>>> {
    return { ...this.buttonOptions };
  }
}