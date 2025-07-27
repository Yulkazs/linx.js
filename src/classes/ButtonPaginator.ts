/**
 * Button-based paginator implementation
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
  ButtonPaginationOptions 
} from '../types';
import { getLinxConfig } from '../config';
import { DEFAULT_BUTTONS, CUSTOM_IDS } from '../constants/defaults';
import { ValidationUtils } from '../utils/validation';
import { ErrorHandler } from '../utils/errorHandler';
import { ComponentBuilder } from '../utils/componentBuilder';

export class ButtonPaginator<T = any> extends BasePaginator<T> {
  private buttonOptions: Required<ButtonPaginationOptions<T>>;

  constructor(
    interaction: LinxInteraction,
    data: PaginationData<T>,
    options: ButtonPaginationOptions<T> = {}
  ) {
    super(interaction, data, options);

    // Validate button-specific options
    ValidationUtils.validateButtonOptions(options);

    const config = getLinxConfig();

    // Merge button-specific options with defaults
    this.buttonOptions = {
      ...this.options,
      previousLabel: options.previousLabel ?? DEFAULT_BUTTONS.PREVIOUS_LABEL,
      nextLabel: options.nextLabel ?? DEFAULT_BUTTONS.NEXT_LABEL,
      previousEmoji: options.previousEmoji ?? DEFAULT_BUTTONS.PREVIOUS_EMOJI,
      nextEmoji: options.nextEmoji ?? DEFAULT_BUTTONS.NEXT_EMOJI,
      buttonStyle: options.buttonStyle ?? config.defaults.buttonStyle,
      disableButtonsAtEdges: options.disableButtonsAtEdges ?? config.defaults.disableButtonsAtEdges,
      showPageCounter: options.showPageCounter ?? config.defaults.showPageCounter
    };
  }

  protected buildComponents(): ActionRowBuilder<ButtonBuilder>[] {
    const row = new ActionRowBuilder<ButtonBuilder>();

    // Previous button - Build it step by step
    const previousButton = new ButtonBuilder()
      .setCustomId(CUSTOM_IDS.BUTTON_PREVIOUS)
      .setStyle(this.buttonOptions.buttonStyle)
      .setDisabled(this.buttonOptions.disableButtonsAtEdges && !this.hasPreviousPage());

    // Add label or emoji (ensure at least one exists)
    if (this.buttonOptions.previousLabel) {
      previousButton.setLabel(this.buttonOptions.previousLabel);
    }
    if (this.buttonOptions.previousEmoji) {
      previousButton.setEmoji(this.buttonOptions.previousEmoji);
    }
    // Fallback if neither label nor emoji is set
    if (!this.buttonOptions.previousLabel && !this.buttonOptions.previousEmoji) {
      previousButton.setLabel('Previous');
    }

    // Next button - Build it step by step
    const nextButton = new ButtonBuilder()
      .setCustomId(CUSTOM_IDS.BUTTON_NEXT)
      .setStyle(this.buttonOptions.buttonStyle)
      .setDisabled(this.buttonOptions.disableButtonsAtEdges && !this.hasNextPage());

    // Add label or emoji (ensure at least one exists)
    if (this.buttonOptions.nextLabel) {
      nextButton.setLabel(this.buttonOptions.nextLabel);
    }
    if (this.buttonOptions.nextEmoji) {
      nextButton.setEmoji(this.buttonOptions.nextEmoji);
    }
    // Fallback if neither label nor emoji is set
    if (!this.buttonOptions.nextLabel && !this.buttonOptions.nextEmoji) {
      nextButton.setLabel('Next');
    }

    // Add page counter button if enabled
    if (this.buttonOptions.showPageCounter) {
      const pageCounterButton = new ButtonBuilder()
        .setCustomId(`linx_counter_${Date.now()}`) // Unique ID to avoid conflicts
        .setLabel(`${this.state.currentPage + 1} / ${this.state.totalPages}`)
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true);

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

        default:
          // Unknown button interaction
          this.emit('error', ErrorHandler.component(
            'Button', 
            `Unknown button interaction: ${componentInteraction.customId}`
          ));
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
    if (newOptions.previousLabel !== undefined) {
      this.buttonOptions.previousLabel = newOptions.previousLabel;
    }
    if (newOptions.nextLabel !== undefined) {
      this.buttonOptions.nextLabel = newOptions.nextLabel;
    }
    if (newOptions.previousEmoji !== undefined) {
      this.buttonOptions.previousEmoji = newOptions.previousEmoji;
    }
    if (newOptions.nextEmoji !== undefined) {
      this.buttonOptions.nextEmoji = newOptions.nextEmoji;
    }
    if (newOptions.buttonStyle !== undefined) {
      this.buttonOptions.buttonStyle = newOptions.buttonStyle;
    }
    if (newOptions.disableButtonsAtEdges !== undefined) {
      this.buttonOptions.disableButtonsAtEdges = newOptions.disableButtonsAtEdges;
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