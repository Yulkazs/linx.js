/**
 * Select menu-based paginator implementation
 * Allows users to navigate through pages using a dropdown select menu
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
    ValidationUtils.validateSelectMenuOptions(options);

    const config = getLinxConfig();

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
      optionLabelRenderer: options.optionLabelRenderer ?? this.getDefaultOptionLabelRenderer(options),
      optionDescriptionRenderer: options.optionDescriptionRenderer ?? this.getDefaultOptionDescriptionRenderer(options),
      maxOptionsPerMenu: options.maxOptionsPerMenu ?? config.defaults.maxOptionsPerMenu,
      
      // Convenience options (new intuitive system)
      labelStyle: options.labelStyle ?? 'page-numbers',
      customPrefix: options.customPrefix ?? '',
      customSuffix: options.customSuffix ?? '',
      autoDescriptions: options.autoDescriptions ?? true,
      descriptionMaxLength: options.descriptionMaxLength ?? 50
    };

    // Validate that we don't exceed Discord's limits
    if (this.state.totalPages > this.selectMenuOptions.maxOptionsPerMenu) {
      // For now, we'll limit to the max options per menu
      // In a more advanced implementation, you could create multiple select menus
      console.warn(`Total pages (${this.state.totalPages}) exceeds maxOptionsPerMenu (${this.selectMenuOptions.maxOptionsPerMenu}). Only first ${this.selectMenuOptions.maxOptionsPerMenu} pages will be accessible.`);
    }
  }

  // Gets the appropriate default label renderer based on options
  private getDefaultOptionLabelRenderer(options: SelectMenuPaginationOptions<T>): (item: T, index: number) => string {
    // If user specified a label style, use it
    const labelStyle = options.labelStyle ?? 'page-numbers';
    
    return (item: T, index: number) => {
      const pageNumber = index + 1; // Always start from 1 for user-facing numbers
      
      switch (labelStyle) {
        case 'page-numbers':
          return `Page ${pageNumber}`;
          
        case 'custom-numbers':
          const prefix = options.customPrefix || 'Item';
          const suffix = options.customSuffix ? ` ${options.customSuffix}` : '';
          return `${prefix} ${pageNumber}${suffix}`;
          
        case 'custom-labels':
          // Fall back to original default if no custom renderer provided
          return `Page ${pageNumber}`;
          
        default:
          return `Page ${pageNumber}`;
      }
    };
  }

  // Gets the appropriate default description renderer based on options
  private getDefaultOptionDescriptionRenderer(options: SelectMenuPaginationOptions<T>): (item: T, index: number) => string {
    // If auto descriptions are disabled, return empty string
    if (options.autoDescriptions === false) {
      return (item: T, index: number) => '';
    }
    
    // If user specified custom description length
    const maxLength = options.descriptionMaxLength ?? 50;
    
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

  // Default option label renderer - shows page number
  private defaultOptionLabelRenderer(item: T, index: number): string {
    return `Page ${index + 1}`;
  }

  // Default option description renderer - shows preview of content
  private defaultOptionDescriptionRenderer(item: T, index: number): string {
    if (typeof item === 'string') {
      // Truncate string content for description
      return item.length > 50 ? `${item.substring(0, 47)}...` : item;
    }
    
    if (item && typeof item === 'object') {
      // Try to find a title, name, or similar property
      const obj = item as any;
      if (obj.title) return typeof obj.title === 'string' ? obj.title : String(obj.title);
      if (obj.name) return typeof obj.name === 'string' ? obj.name : String(obj.name);
      if (obj.label) return typeof obj.label === 'string' ? obj.label : String(obj.label);
      
      // Fallback to showing object type
      return `Object with ${Object.keys(obj).length} properties`;
    }

    return `Item ${index + 1}`;
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

    // Update options
    if (newOptions.placeholder !== undefined) {
      this.selectMenuOptions.placeholder = newOptions.placeholder;
    }
    if (newOptions.minValues !== undefined) {
      this.selectMenuOptions.minValues = newOptions.minValues;
    }
    if (newOptions.maxValues !== undefined) {
      this.selectMenuOptions.maxValues = newOptions.maxValues;
    }
    if (newOptions.optionLabelRenderer !== undefined) {
      this.selectMenuOptions.optionLabelRenderer = newOptions.optionLabelRenderer;
    }
    if (newOptions.optionDescriptionRenderer !== undefined) {
      this.selectMenuOptions.optionDescriptionRenderer = newOptions.optionDescriptionRenderer;
    }
    if (newOptions.maxOptionsPerMenu !== undefined) {
      this.selectMenuOptions.maxOptionsPerMenu = newOptions.maxOptionsPerMenu;
      
      // Warn if totalPages exceeds new limit
      if (this.state.totalPages > newOptions.maxOptionsPerMenu) {
        console.warn(`Total pages (${this.state.totalPages}) exceeds new maxOptionsPerMenu (${newOptions.maxOptionsPerMenu}). Only first ${newOptions.maxOptionsPerMenu} pages will be accessible.`);
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
}