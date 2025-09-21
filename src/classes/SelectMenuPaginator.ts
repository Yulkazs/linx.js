//Select menu-based paginator implementation with simplified labeling API

import { 
  ActionRowBuilder, 
  StringSelectMenuBuilder, 
  StringSelectMenuOptionBuilder,
  StringSelectMenuInteraction 
} from 'discord.js';

import { BasePaginator } from './BasePaginator';
import { 
  LinxInteraction, 
  PaginationData, 
  SelectMenuPaginationOptions,
  LabelOption,
  CustomLabelRenderer,
  PageRenderer,
  AfterTimeoutBehavior
} from '../types';
import { getLinxConfig } from '../config';
import { DEFAULT_SELECT_MENU, CUSTOM_IDS } from '../constants/defaults';
import { ValidationUtils } from '../utils/validation';
import { ErrorHandler } from '../utils/errorHandler';

export class SelectMenuPaginator<T = any> extends BasePaginator<T> {
  private selectMenuOptions: Omit<Required<SelectMenuPaginationOptions<T>>, 'customLabelRenderer'> & {
    customLabelRenderer?: CustomLabelRenderer<T>;
  };
  
  private labelConfig: {
    type: 'page-numbers' | 'custom-numbers' | 'custom-labels';
    prefix?: string;
    suffix?: string;
    customRenderer?: CustomLabelRenderer<T>;
  };

  constructor(
    interaction: LinxInteraction,
    data: PaginationData<T>,
    options: SelectMenuPaginationOptions<T> = {}
  ) {
    super(interaction, data, options);

    const config = getLinxConfig();

    // Parse and validate label configuration
    this.labelConfig = this.parseLabelOption(options.labelOption);
    
    // Validate custom renderer if needed
    if (this.labelConfig.type === 'custom-labels') {
      if (!options.customLabelRenderer) {
        throw ErrorHandler.validation(
          'customLabelRenderer', 
          options.customLabelRenderer, 
          'function when using CustomLabels'
        );
      }
      this.labelConfig.customRenderer = options.customLabelRenderer;
    }

    // Set up options with defaults
    this.selectMenuOptions = {
      // Base options from parent
      ephemeral: this.options.ephemeral,
      timeout: this.options.timeout,
      pageRenderer: this.options.pageRenderer,
      startPage: this.options.startPage,
      timeoutMessage: this.options.timeoutMessage,
      afterTimeout: this.options.afterTimeout,
      
      // Select menu specific options
      placeholder: options.placeholder ?? DEFAULT_SELECT_MENU.PLACEHOLDER,
      customId: options.customId ?? `${DEFAULT_SELECT_MENU.CUSTOM_ID_PREFIX}_${Date.now()}`,
      minValues: options.minValues ?? DEFAULT_SELECT_MENU.MIN_VALUES,
      maxValues: options.maxValues ?? DEFAULT_SELECT_MENU.MAX_VALUES,
      maxOptionsPerMenu: options.maxOptionsPerMenu ?? config.defaults.maxOptionsPerMenu,
      
      // Label and description settings
      labelOption: options.labelOption ?? 'PageNumbers',
      customLabelRenderer: options.customLabelRenderer,
      autoDescriptions: options.autoDescriptions ?? true,
      descriptionMaxLength: options.descriptionMaxLength ?? 50
    };

    // Validate Discord limits
    if (this.state.totalPages > this.selectMenuOptions.maxOptionsPerMenu) {
      console.warn(`[LinxJS] Total pages (${this.state.totalPages}) exceeds maxOptionsPerMenu (${this.selectMenuOptions.maxOptionsPerMenu}). Only first ${this.selectMenuOptions.maxOptionsPerMenu} pages will be accessible.`);
    }

    // Validate custom ID format
    ValidationUtils.validateCustomId(this.selectMenuOptions.customId);
  }

  //Parses the labelOption into internal configuration with validation
  private parseLabelOption(labelOption: LabelOption = 'PageNumbers'): {
    type: 'page-numbers' | 'custom-numbers' | 'custom-labels';
    prefix?: string;
    suffix?: string;
  } {
    // Default case - Page Numbers
    if (labelOption === 'PageNumbers' || !labelOption) {
      return { type: 'page-numbers' };
    }
    
    // Custom labels case
    if (labelOption === 'CustomLabels') {
      return { type: 'custom-labels' };
    }
    
    // Custom numbers case
    if (Array.isArray(labelOption) && labelOption[0] === 'CustomNumbers') {
      if (labelOption.length === 2) {
        // ['CustomNumbers', 'Chapter'] → prefix only
        const prefix = labelOption[1];
        if (!prefix || prefix.trim().length === 0) {
          throw ErrorHandler.validation(
            'labelOption prefix', 
            prefix, 
            'non-empty string when using CustomNumbers'
          );
        }
        return { type: 'custom-numbers', prefix: prefix.trim() };
      } 
      else if (labelOption.length === 3) {
        const [, prefix, suffix] = labelOption;
        
        // ['CustomNumbers', '', 'Summary'] → suffix only
        if (!prefix || prefix.trim().length === 0) {
          if (!suffix || suffix.trim().length === 0) {
            throw ErrorHandler.validation(
              'labelOption', 
              labelOption, 
              'either prefix or suffix to be non-empty'
            );
          }
          return { type: 'custom-numbers', suffix: suffix.trim() };
        }
        
        // ['CustomNumbers', 'Chapter', 'Summary'] → prefix + suffix (prefix takes priority)
        return { 
          type: 'custom-numbers', 
          prefix: prefix.trim(), 
          suffix: suffix.trim() 
        };
      }
      else {
        throw ErrorHandler.validation(
          'labelOption', 
          labelOption, 
          'CustomNumbers array with 2 or 3 elements: [\'CustomNumbers\', prefix] or [\'CustomNumbers\', prefix, suffix]'
        );
      }
    }
    
    throw ErrorHandler.validation(
      'labelOption', 
      labelOption, 
      'PageNumbers, CustomLabels, or CustomNumbers array format'
    );
  }

  //Generates the label for a select menu option based on configuration
  private generateOptionLabel(item: T, index: number): string {
    const pageNumber = index + 1;
    
    switch (this.labelConfig.type) {
      case 'page-numbers':
        return `Page ${pageNumber}`;
        
      case 'custom-numbers':
        if (this.labelConfig.prefix && this.labelConfig.suffix) {
          // Both exist - prefix takes priority as per requirements
          return `${this.labelConfig.prefix} ${pageNumber}`;
        } else if (this.labelConfig.prefix) {
          // Prefix only
          return `${this.labelConfig.prefix} ${pageNumber}`;
        } else if (this.labelConfig.suffix) {
          // Suffix only
          return `${pageNumber} ${this.labelConfig.suffix}`;
        } else {
          return `${pageNumber}`;
        }
        
      case 'custom-labels':
        if (this.labelConfig.customRenderer) {
          const result = this.labelConfig.customRenderer(item, index);
          if (!result || typeof result.label !== 'string' || result.label.trim().length === 0) {
            throw ErrorHandler.render(
              index,
              'Custom label renderer must return an object with a non-empty label string'
            );
          }
          return result.label.trim();
        }
        return `Page ${pageNumber}`;
        
      default:
        return `Page ${pageNumber}`;
    }
  }

  //Generates the description for a select menu option
  private generateOptionDescription(item: T, index: number): string {
    // Custom labels can provide their own descriptions
    if (this.labelConfig.type === 'custom-labels' && this.labelConfig.customRenderer) {
      const result = this.labelConfig.customRenderer(item, index);
      return result?.description?.trim() || '';
    }
    
    // Auto descriptions for other types
    if (!this.selectMenuOptions.autoDescriptions) {
      return '';
    }
    
    const maxLength = this.selectMenuOptions.descriptionMaxLength;
    
    // Handle string items
    if (typeof item === 'string') {
      return item.length > maxLength ? `${item.substring(0, maxLength - 3)}...` : item;
    }
    
    // Handle object items
    if (item && typeof item === 'object') {
      const obj = item as any;
      let description = '';
      
      // Try to find appropriate content in priority order
      if (obj.description) description = String(obj.description);
      else if (obj.content) description = String(obj.content);
      else if (obj.title) description = String(obj.title);
      else if (obj.name) description = String(obj.name);
      else if (obj.label) description = String(obj.label);
      else description = `Object with ${Object.keys(obj).length} properties`;
      
      return description.length > maxLength ? 
        `${description.substring(0, maxLength - 3)}...` : description;
    }

    // Handle primitive values
    const stringItem = String(item);
    return stringItem.length > maxLength ? 
      `${stringItem.substring(0, maxLength - 3)}...` : stringItem;
  }

  //Builds the select menu components
  protected buildComponents(): ActionRowBuilder<StringSelectMenuBuilder>[] {
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(this.selectMenuOptions.customId)
      .setPlaceholder(this.selectMenuOptions.placeholder)
      .setMinValues(this.selectMenuOptions.minValues)
      .setMaxValues(this.selectMenuOptions.maxValues);

    // Create options for each page (limited by maxOptionsPerMenu)
    const maxOptions = Math.min(this.state.totalPages, this.selectMenuOptions.maxOptionsPerMenu);
    const options: StringSelectMenuOptionBuilder[] = [];

    for (let i = 0; i < maxOptions; i++) {
      const item = this.state.data[i];
      
      try {
        const label = this.generateOptionLabel(item, i);
        const description = this.generateOptionDescription(item, i);
        
        // Validate label length
        if (label.length > 100) {
          throw ErrorHandler.validation(
            `option[${i}].label`, 
            label, 
            'string with max length 100 characters'
          );
        }
        
        const option = new StringSelectMenuOptionBuilder()
          .setLabel(label)
          .setValue(i.toString())
          .setDefault(i === this.state.currentPage);

        // Add description if provided and not empty
        if (description && description.trim()) {
          const trimmedDesc = description.trim();
          
          // Validate description length
          if (trimmedDesc.length > 100) {
            option.setDescription(`${trimmedDesc.substring(0, 97)}...`);
          } else {
            option.setDescription(trimmedDesc);
          }
        }

        options.push(option);
        
      } catch (error) {
        // Log the error but continue with a fallback option
        console.error(`[LinxJS] Error generating option ${i}:`, error);
        
        const fallbackOption = new StringSelectMenuOptionBuilder()
          .setLabel(`Page ${i + 1}`)
          .setValue(i.toString())
          .setDefault(i === this.state.currentPage);
          
        options.push(fallbackOption);
      }
    }

    // Ensure we have at least one option
    if (options.length === 0) {
      throw ErrorHandler.component('SelectMenu', 'No valid options could be generated');
    }

    selectMenu.addOptions(options);

    const row = new ActionRowBuilder<StringSelectMenuBuilder>();
    row.addComponents(selectMenu);

    return [row];
  }

  //Handles select menu interactions
  protected async handleComponentInteraction(componentInteraction: StringSelectMenuInteraction): Promise<void> {
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
      // Check if this is our select menu
      if (componentInteraction.customId !== this.selectMenuOptions.customId) {
        this.emit('error', ErrorHandler.component(
          'SelectMenu', 
          `Unknown select menu interaction: ${componentInteraction.customId}`
        ));
        return;
      }

      // Get the selected page
      const selectedValues = componentInteraction.values;
      if (selectedValues.length === 0) {
        return;
      }

      const selectedPage = parseInt(selectedValues[0], 10);
      
      // Validate the page number
      if (isNaN(selectedPage) || selectedPage < 0 || selectedPage >= this.state.totalPages) {
        this.emit('error', ErrorHandler.component(
          'SelectMenu', 
          `Invalid page selection: ${selectedValues[0]}`
        ));
        return;
      }

      // Navigate to the selected page
      if (selectedPage !== this.state.currentPage) {
        await this.goToPage(selectedPage);
      }
    } catch (error) {
      this.emit('error', ErrorHandler.handle(error as Error));
    }
  }

  //Updates select menu options dynamically
  updateSelectMenuOptions(newOptions: Partial<SelectMenuPaginationOptions<T>>): void {
    if (!this.state.isActive) {
      throw ErrorHandler.validation('paginator', 'inactive', 'active paginator');
    }

    // Update basic options
    if (newOptions.placeholder !== undefined) {
      ValidationUtils.validateSelectPlaceholder(newOptions.placeholder);
      this.selectMenuOptions.placeholder = newOptions.placeholder;
    }
    
    if (newOptions.minValues !== undefined && newOptions.maxValues !== undefined) {
      ValidationUtils.validateSelectValues(newOptions.minValues, newOptions.maxValues);
      this.selectMenuOptions.minValues = newOptions.minValues;
      this.selectMenuOptions.maxValues = newOptions.maxValues;
    }
    
    if (newOptions.maxOptionsPerMenu !== undefined) {
      if (!Number.isInteger(newOptions.maxOptionsPerMenu) || 
          newOptions.maxOptionsPerMenu < 1 || 
          newOptions.maxOptionsPerMenu > 25) {
        throw ErrorHandler.validation(
          'maxOptionsPerMenu', 
          newOptions.maxOptionsPerMenu, 
          'integer between 1 and 25'
        );
      }
      
      this.selectMenuOptions.maxOptionsPerMenu = newOptions.maxOptionsPerMenu;
      
      if (this.state.totalPages > newOptions.maxOptionsPerMenu) {
        console.warn(`[LinxJS] Total pages (${this.state.totalPages}) exceeds new maxOptionsPerMenu (${newOptions.maxOptionsPerMenu}). Only first ${newOptions.maxOptionsPerMenu} pages will be accessible.`);
      }
    }

    // Update label configuration if provided
    if (newOptions.labelOption !== undefined) {
      this.labelConfig = this.parseLabelOption(newOptions.labelOption);
      this.selectMenuOptions.labelOption = newOptions.labelOption;
    }

    // Update custom renderer if provided
    if (newOptions.customLabelRenderer !== undefined) {
      if (this.labelConfig.type === 'custom-labels') {
        this.labelConfig.customRenderer = newOptions.customLabelRenderer;
        this.selectMenuOptions.customLabelRenderer = newOptions.customLabelRenderer;
      }
    }

    // Update description settings
    if (newOptions.autoDescriptions !== undefined) {
      this.selectMenuOptions.autoDescriptions = newOptions.autoDescriptions;
    }
    
    if (newOptions.descriptionMaxLength !== undefined) {
      if (!Number.isInteger(newOptions.descriptionMaxLength) || 
          newOptions.descriptionMaxLength < 1) {
        throw ErrorHandler.validation(
          'descriptionMaxLength', 
          newOptions.descriptionMaxLength, 
          'positive integer'
        );
      }
      this.selectMenuOptions.descriptionMaxLength = newOptions.descriptionMaxLength;
    }

    // Update the message with new components
    this.updateMessage().catch(error => {
      this.emit('error', ErrorHandler.handle(error));
    });
  }

  //Gets current select menu options (read-only)
  getSelectMenuOptions(): Readonly<Omit<Required<SelectMenuPaginationOptions<T>>, 'customLabelRenderer'> & {
    customLabelRenderer?: CustomLabelRenderer<T>;
  }> {
    return Object.freeze({ ...this.selectMenuOptions });
  }

  //Gets current label configuration info for debugging
  getLabelConfiguration(): {
    type: 'page-numbers' | 'custom-numbers' | 'custom-labels';
    prefix?: string;
    suffix?: string;
    hasCustomRenderer: boolean;
  } {
    return {
      type: this.labelConfig.type,
      prefix: this.labelConfig.prefix,
      suffix: this.labelConfig.suffix,
      hasCustomRenderer: !!this.labelConfig.customRenderer
    };
  }

  //Override updateData to handle maxOptionsPerMenu limit
  updateData(newData: PaginationData<T>): void {
    super.updateData(newData);
    
    if (this.state.totalPages > this.selectMenuOptions.maxOptionsPerMenu) {
      console.warn(`[LinxJS] New data has ${this.state.totalPages} pages, but maxOptionsPerMenu is ${this.selectMenuOptions.maxOptionsPerMenu}. Only first ${this.selectMenuOptions.maxOptionsPerMenu} pages will be accessible.`);
    }
  }

  // Helper methods for developers
  areAllPagesAccessible(): boolean {
    return this.state.totalPages <= this.selectMenuOptions.maxOptionsPerMenu;
  }

  getAccessiblePageCount(): number {
    return Math.min(this.state.totalPages, this.selectMenuOptions.maxOptionsPerMenu);
  }

  isPageAccessible(pageIndex: number): boolean {
    return pageIndex >= 0 && pageIndex < this.getAccessiblePageCount();
  }
}