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

    // Previous button
    const previousButton = ComponentBuilder.createButton({
      customId: CUSTOM_IDS.BUTTON_PREVIOUS,
      label: this.buttonOptions.previousLabel,
      emoji: this.buttonOptions.previousEmoji,
      style: this.buttonOptions.buttonStyle,
      disabled: this.buttonOptions.disableButtonsAtEdges && !this.hasPreviousPage()
    });

    // Next button
    const nextButton = ComponentBuilder.createButton({
      customId: CUSTOM_IDS.BUTTON_NEXT,
      label: this.buttonOptions.nextLabel,
      emoji: this.buttonOptions.nextEmoji,
      style: this.buttonOptions.buttonStyle,
      disabled: this.buttonOptions.disableButtonsAtEdges && !this.hasNextPage()
    });

    row.addComponents(previousButton, nextButton);

    // Add page counter button if enabled
    if (this.buttonOptions.showPageCounter) {
      const pageCounterButton = ComponentBuilder.createButton({
        customId: `${CUSTOM_IDS.BUTTON_PREVIOUS}_counter`,
        label: `${this.state.currentPage + 1} / ${this.state.totalPages}`,
        style: ButtonStyle.Secondary,
        disabled: true
      });

      // Add all buttons to the row
      row.addComponents(previousButton, pageCounterButton, nextButton);
    } else {
      // Add only prev and next buttons
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