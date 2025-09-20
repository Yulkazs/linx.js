/**
 * Select menu-based paginator implementation
 * Fixed: Proper handling of three labeling options with validation
 */

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
  SelectMenuPaginationOptions 
} from '../types';
import { getLinxConfig } from '../config';
import { DEFAULT_SELECT_MENU, CUSTOM_IDS } from '../constants/defaults';
import { ValidationUtils } from '../utils/validation';
import { ErrorHandler } from '../utils/errorHandler';

export class SelectMenuPaginator<T = any> extends BasePaginator<T> {
  private selectMenuOptions: Required<SelectMenuPaginationOptions<T>>;

  constructor(
    interaction: LinxInteraction,
    data: PaginationData<T>,
    options: SelectMenuPaginationOptions<T> = {}
  ) {
    super(interaction, data, options);
    
    // Validate select menu options first
    ValidationUtils.validateSelectMenuOptions(options);

    const config = getLinxConfig();

    // Determine which labeling system to use (priority: custom-labels > custom-numbers > page-numbers)
    let finalLabelStyle: 'page-numbers' | 'custom-numbers' | 'custom-labels' = 'page-numbers';
    let finalCustomPrefix = '';
    let finalCustomSuffix = '';
    let finalOptionLabelRenderer: ((item: T, index: number) => string) | undefined;
    let finalOptionDescriptionRenderer: ((item: T, index: number) => string) | undefined;

    // Validate the labeling options and determine which one to use
    const hasCustomLabels = options.optionLabelRenderer !== undefined;
    const hasCustomNumbers = options.labelStyle === 'custom-numbers' || options.customPrefix !== undefined;
    const hasPageNumbers = options.labelStyle === 'page-numbers' || (!hasCustomLabels && !hasCustomNumbers);

    // Check for conflicting options and warn
    const activeOptions = [hasCustomLabels, hasCustomNumbers, hasPageNumbers].filter(Boolean).length;
    if (activeOptions > 1) {
      console.warn('[LinxJS] Multiple labeling options detected. Using priority: custom-labels > custom-numbers > page-numbers');
    }

    // Set the final labeling system based on priority
    if (hasCustomLabels) {
      finalLabelStyle = 'custom-labels';
      finalOptionLabelRenderer = options.optionLabelRenderer;
      finalOptionDescriptionRenderer = options.optionDescriptionRenderer;
    } else if (hasCustomNumbers) {
      finalLabelStyle = 'custom-numbers';
      finalCustomPrefix = options.customPrefix || 'Section';
      finalCustomSuffix = options.customSuffix || '';
      
      // Validate prefix if using custom numbers
      if (finalCustomPrefix.trim().length === 0) {
        throw ErrorHandler.validation('customPrefix', finalCustomPrefix, 'non-empty string when using custom-numbers');
      }
    } else {
      finalLabelStyle = 'page-numbers';
    }

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
      
      // Final determined labeling system
      labelStyle: finalLabelStyle,
      customPrefix: finalCustomPrefix,
      customSuffix: finalCustomSuffix,
      autoDescriptions: options.autoDescriptions ?? true,
      descriptionMaxLength: options.descriptionMaxLength ?? 50,
      
      // Set the appropriate renderers based on the determined system
      optionLabelRenderer: finalOptionLabelRenderer || this.getDefaultOptionLabelRenderer(finalLabelStyle, finalCustomPrefix, finalCustomSuffix),
      optionDescriptionRenderer: finalOptionDescriptionRenderer || this.getDefaultOptionDescriptionRenderer(options.autoDescriptions ?? true, options.descriptionMaxLength ?? 50)
    };

    // Validate that we don't exceed Discord's limits
    if (this.state.totalPages > this.selectMenuOptions.maxOptionsPerMenu) {
      console.warn(`Total pages (${this.state.totalPages}) exceeds maxOptionsPerMenu (${this.selectMenuOptions.maxOptionsPerMenu}). Only first ${this.selectMenuOptions.maxOptionsPerMenu} pages will be accessible.`);
    }
  }

  // Gets the appropriate default label renderer based on determined labeling system
  private getDefaultOptionLabelRenderer(
    labelStyle: 'page-numbers' | 'custom-numbers' | 'custom-labels',
    customPrefix: string,
    customSuffix: string
  ): (item: T, index: number) => string {
    return (item: T, index: number) => {
      const pageNumber = index + 1; // Always start from 1 for user-facing numbers
      
      switch (labelStyle) {
        case 'page-numbers':
          return `Page ${pageNumber}`;
          
        case 'custom-numbers':
          const suffix = customSuffix ? ` ${customSuffix}` : '';
          return `${customPrefix} ${pageNumber}${suffix}`;
          
        case 'custom-labels':
          // This should never be reached since custom-labels uses the provided renderer
          return `Page ${pageNumber}`;
          
        default:
          return `Page ${pageNumber}`;
      }
    };
  }

  // Gets the appropriate default description renderer
  private getDefaultOptionDescriptionRenderer(
    autoDescriptions: boolean, 
    maxLength: number
  ): (item: T, index: number) => string {
    // If auto descriptions are disabled, return empty string
    if (!autoDescriptions) {
      return (item: T, index: number) => '';
    }
    
    return (item: T, index: number) => {
      if (typeof item === 'string') {
        return item.length > maxLength ? `${item.substring(0, maxLength - 3)}...` : item;
      }
      
      if (item && typeof item === 'object') {
        const obj = item as any;
        let description = '';
        
        // Try to find appropriate content
        if (obj.description) description = String(obj.description);
        else if (obj.content) description = String(obj.content);
        else if (obj.title) description = String(obj.title);
        else if (obj.name) description = String(obj.name);
        else if (obj.label) description = String(obj.label);
        else description = `Object with ${Object.keys(obj).length} properties`;
        
        return description.length > maxLength ? `${description.substring(0, maxLength - 3)}...` : description;
      }

      const stringItem = String(item);
      return stringItem.length > maxLength ? `${stringItem.substring(0, maxLength - 3)}...` : stringItem;
    };
  }

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
      const label = this.selectMenuOptions.optionLabelRenderer(item, i);
      const description = this.selectMenuOptions.optionDescriptionRenderer(item, i);
      
      const option = new StringSelectMenuOptionBuilder()
        .setLabel(label)
        .setValue(i.toString())
        .setDefault(i === this.state.currentPage);

      // Add description if provided and not empty
      if (description && description.trim()) {
        option.setDescription(description);
      }

      options.push(option);
    }

    selectMenu.addOptions(options);

    const row = new ActionRowBuilder<StringSelectMenuBuilder>();
    row.addComponents(selectMenu);

    return [row];
  }

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
        return; // No selection made
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

  // Updates select menu options dynamically
  updateSelectMenuOptions(newOptions: Partial<SelectMenuPaginationOptions<T>>): void {
    if (!this.state.isActive) {
      throw ErrorHandler.validation('paginator', 'inactive', 'active paginator');
    }

    // Validate new options
    ValidationUtils.validateSelectMenuOptions(newOptions);

    // Update basic options
    if (newOptions.placeholder !== undefined) {
      this.selectMenuOptions.placeholder = newOptions.placeholder;
    }
    if (newOptions.minValues !== undefined) {
      this.selectMenuOptions.minValues = newOptions.minValues;
    }
    if (newOptions.maxValues !== undefined) {
      this.selectMenuOptions.maxValues = newOptions.maxValues;
    }
    if (newOptions.maxOptionsPerMenu !== undefined) {
      this.selectMenuOptions.maxOptionsPerMenu = newOptions.maxOptionsPerMenu;
      
      // Warn if totalPages exceeds new limit
      if (this.state.totalPages > newOptions.maxOptionsPerMenu) {
        console.warn(`Total pages (${this.state.totalPages}) exceeds new maxOptionsPerMenu (${newOptions.maxOptionsPerMenu}). Only first ${newOptions.maxOptionsPerMenu} pages will be accessible.`);
      }
    }

    // Handle labeling system updates with same priority logic
    const hasNewCustomLabels = newOptions.optionLabelRenderer !== undefined;
    const hasNewCustomNumbers = newOptions.labelStyle === 'custom-numbers' || newOptions.customPrefix !== undefined;
    const hasNewPageNumbers = newOptions.labelStyle === 'page-numbers';

    if (hasNewCustomLabels) {
      this.selectMenuOptions.labelStyle = 'custom-labels';
      this.selectMenuOptions.optionLabelRenderer = newOptions.optionLabelRenderer!;
      if (newOptions.optionDescriptionRenderer !== undefined) {
        this.selectMenuOptions.optionDescriptionRenderer = newOptions.optionDescriptionRenderer;
      }
    } else if (hasNewCustomNumbers) {
      this.selectMenuOptions.labelStyle = 'custom-numbers';
      this.selectMenuOptions.customPrefix = newOptions.customPrefix || 'Section';
      this.selectMenuOptions.customSuffix = newOptions.customSuffix || '';
      this.selectMenuOptions.optionLabelRenderer = this.getDefaultOptionLabelRenderer(
        'custom-numbers', 
        this.selectMenuOptions.customPrefix, 
        this.selectMenuOptions.customSuffix
      );
    } else if (hasNewPageNumbers) {
      this.selectMenuOptions.labelStyle = 'page-numbers';
      this.selectMenuOptions.customPrefix = '';
      this.selectMenuOptions.customSuffix = '';
      this.selectMenuOptions.optionLabelRenderer = this.getDefaultOptionLabelRenderer('page-numbers', '', '');
    }

    // Update description settings
    if (newOptions.autoDescriptions !== undefined || newOptions.descriptionMaxLength !== undefined) {
      if (newOptions.autoDescriptions !== undefined) {
        this.selectMenuOptions.autoDescriptions = newOptions.autoDescriptions;
      }
      if (newOptions.descriptionMaxLength !== undefined) {
        this.selectMenuOptions.descriptionMaxLength = newOptions.descriptionMaxLength;
      }
      
      // Update description renderer if not using custom labels
      if (this.selectMenuOptions.labelStyle !== 'custom-labels') {
        this.selectMenuOptions.optionDescriptionRenderer = this.getDefaultOptionDescriptionRenderer(
          this.selectMenuOptions.autoDescriptions,
          this.selectMenuOptions.descriptionMaxLength
        );
      }
    }

    // Update the message with new components
    this.updateMessage().catch(error => {
      this.emit('error', ErrorHandler.handle(error));
    });
  }

  // Gets current select menu options
  getSelectMenuOptions(): Readonly<Required<SelectMenuPaginationOptions<T>>> {
    return { ...this.selectMenuOptions };
  }

  // Override updateData to handle maxOptionsPerMenu limit
  updateData(newData: PaginationData<T>): void {
    super.updateData(newData);
    
    // Warn if new data exceeds select menu limits
    if (this.state.totalPages > this.selectMenuOptions.maxOptionsPerMenu) {
      console.warn(`New data has ${this.state.totalPages} pages, but maxOptionsPerMenu is ${this.selectMenuOptions.maxOptionsPerMenu}. Only first ${this.selectMenuOptions.maxOptionsPerMenu} pages will be accessible.`);
    }
  }

  // Helper method to check if all pages are accessible
  areAllPagesAccessible(): boolean {
    return this.state.totalPages <= this.selectMenuOptions.maxOptionsPerMenu;
  }

  // Helper method to get the number of accessible pages
  getAccessiblePageCount(): number {
    return Math.min(this.state.totalPages, this.selectMenuOptions.maxOptionsPerMenu);
  }

  // Helper method to check if a specific page is accessible via select menu
  isPageAccessible(pageIndex: number): boolean {
    return pageIndex >= 0 && pageIndex < this.getAccessiblePageCount();
  }

  // Helper method to get current labeling system info
  getLabelingSystemInfo(): {
    style: 'page-numbers' | 'custom-numbers' | 'custom-labels';
    prefix?: string;
    suffix?: string;
    isCustomRenderer: boolean;
  } {
    return {
      style: this.selectMenuOptions.labelStyle,
      prefix: this.selectMenuOptions.customPrefix || undefined,
      suffix: this.selectMenuOptions.customSuffix || undefined,
      isCustomRenderer: this.selectMenuOptions.labelStyle === 'custom-labels'
    };
  }
}