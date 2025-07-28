/**
 * Button-based paginator implementation with new cleaner API
 * Fixed: Custom emoji support and first/last button implementation
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
      showPageCounter: options.showPageCounter ?? config.defaults.showPageCounter,
      showFirstLast: options.showFirstLast ?? true
    };
  }

  private parseButtonConfig(
    config: ButtonConfig, 
    defaultLabel: string, 
    defaultEmoji: string,
    buttonType?: string
  ): ParsedButtonConfig {
    const isLeftButton = buttonType === 'first' || buttonType === 'previous';
    
    if (typeof config === 'string') {
      // Single string - could be label or emoji (including custom Discord emojis)
      if (ValidationUtils.isEmoji(config) || ValidationUtils.isCustomEmoji(config)) {
        // Just emoji provided, use default label with proper positioning
        if (isLeftButton) {
          return { label: `${config} ${defaultLabel}`, emoji: '' };
        } else {
          return { label: `${defaultLabel} ${config}`, emoji: '' };
        }
      } else {
        if (isLeftButton) {
          return { label: `${defaultEmoji} ${config}`, emoji: '' };
        } else {
          return { label: `${config} ${defaultEmoji}`, emoji: '' };
        }
      }
    } else if (Array.isArray(config)) {
      if (config.length === 1) {
        const value = config[0];
        if (ValidationUtils.isEmoji(value) || ValidationUtils.isCustomEmoji(value)) {
          if (isLeftButton) {
            return { label: `${value} ${defaultLabel}`, emoji: '' };
          } else {
            return { label: `${defaultLabel} ${value}`, emoji: '' };
          }
        } else {
          if (isLeftButton) {
            return { label: `${defaultEmoji} ${value}`, emoji: '' };
          } else {
            return { label: `${value} ${defaultEmoji}`, emoji: '' };
          }
        }
      } else if (config.length === 2) {
        const [label, emoji] = config;
        if (isLeftButton) {
          return { label: `${emoji} ${label}`, emoji: '' };
        } else {
          return { label: `${label} ${emoji}`, emoji: '' };
        }
      }
    }
    
    // Fallback to defaults with proper positioning
    if (isLeftButton) {
      return { label: `${defaultEmoji} ${defaultLabel}`, emoji: '' };
    } else {
      return { label: `${defaultLabel} ${defaultEmoji}`, emoji: '' };
    }
  }

  protected buildComponents(): ActionRowBuilder<ButtonBuilder>[] {
    const buttons: ButtonBuilder[] = [];

    const firstConfig = this.parseButtonConfig(
      this.buttonOptions.first, 
      DEFAULT_BUTTONS.FIRST_LABEL, 
      DEFAULT_BUTTONS.FIRST_EMOJI,
      'first'
    );

    const previousConfig = this.parseButtonConfig(
      this.buttonOptions.previous, 
      DEFAULT_BUTTONS.PREVIOUS_LABEL, 
      DEFAULT_BUTTONS.PREVIOUS_EMOJI,
      'previous'
    );

    const nextConfig = this.parseButtonConfig(
      this.buttonOptions.next, 
      DEFAULT_BUTTONS.NEXT_LABEL, 
      DEFAULT_BUTTONS.NEXT_EMOJI,
      'next'
    );

    const lastConfig = this.parseButtonConfig(
      this.buttonOptions.last, 
      DEFAULT_BUTTONS.LAST_LABEL, 
      DEFAULT_BUTTONS.LAST_EMOJI,
      'last'
    );

    if (this.buttonOptions.showFirstLast && this.state.totalPages > 2) {
      const firstButton = new ButtonBuilder()
        .setCustomId(CUSTOM_IDS.BUTTON_FIRST)
        .setStyle(this.buttonOptions.buttonStyle)
        .setLabel(firstConfig.label)
        .setDisabled(!this.hasPreviousPage());

      if (firstConfig.emoji && !firstConfig.label.includes(firstConfig.emoji)) {
        firstButton.setEmoji(firstConfig.emoji);
      }

      buttons.push(firstButton);
    }

    // Previous button
    const previousButton = new ButtonBuilder()
      .setCustomId(CUSTOM_IDS.BUTTON_PREVIOUS)
      .setStyle(this.buttonOptions.buttonStyle)
      .setLabel(previousConfig.label)
      .setDisabled(!this.hasPreviousPage());

    // Only set emoji separately if we have one and no label was combined
    if (previousConfig.emoji && !previousConfig.label.includes(previousConfig.emoji)) {
      previousButton.setEmoji(previousConfig.emoji);
    }

    buttons.push(previousButton);

    // Page counter button (if enabled)
    if (this.buttonOptions.showPageCounter) {
      const pageCounterButton = new ButtonBuilder()
        .setCustomId(`linx_counter_${Date.now()}`)
        .setLabel(`${this.state.currentPage + 1} / ${this.state.totalPages}`)
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true);

      buttons.push(pageCounterButton);
    }

    // Next button
    const nextButton = new ButtonBuilder()
      .setCustomId(CUSTOM_IDS.BUTTON_NEXT)
      .setStyle(this.buttonOptions.buttonStyle)
      .setLabel(nextConfig.label)
      .setDisabled(!this.hasNextPage());

    // Only set emoji separately if we have one and no label was combined
    if (nextConfig.emoji && !nextConfig.label.includes(nextConfig.emoji)) {
      nextButton.setEmoji(nextConfig.emoji);
    }

    buttons.push(nextButton);

    // Last button (only show if enabled and there are multiple pages)
    if (this.buttonOptions.showFirstLast && this.state.totalPages > 2) {
      const lastButton = new ButtonBuilder()
        .setCustomId(CUSTOM_IDS.BUTTON_LAST)
        .setStyle(this.buttonOptions.buttonStyle)
        .setLabel(lastConfig.label)
        .setDisabled(!this.hasNextPage());

      // Only set emoji separately if we have one and no label was combined
      if (lastConfig.emoji && !lastConfig.label.includes(lastConfig.emoji)) {
        lastButton.setEmoji(lastConfig.emoji);
      }

      buttons.push(lastButton);
    }

    // Create action row with all buttons
    const row = new ActionRowBuilder<ButtonBuilder>();
    row.addComponents(...buttons);

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
        case CUSTOM_IDS.BUTTON_FIRST:
          if (this.hasPreviousPage()) {
            await this.firstPage();
          }
          break;

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
    if (newOptions.showFirstLast !== undefined) {
      this.buttonOptions.showFirstLast = newOptions.showFirstLast;
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