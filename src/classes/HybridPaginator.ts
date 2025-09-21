/**
 * Hybrid paginator that combines buttons and select menu for maximum flexibility
 */

import { 
  ActionRowBuilder, 
  ButtonBuilder, 
  StringSelectMenuBuilder,
  ButtonInteraction,
  StringSelectMenuInteraction
} from 'discord.js';

import { BasePaginator } from './BasePaginator';
import { ButtonPaginator } from './ButtonPaginator';
import { SelectMenuPaginator } from './SelectMenuPaginator';
import { 
  LinxInteraction, 
  PaginationData, 
  HybridPaginationOptions,
  ButtonPaginationOptions,
  SelectMenuPaginationOptions
} from '../types';
import { getLinxConfig } from '../config';
import { CUSTOM_IDS } from '../constants/defaults';
import { ValidationUtils } from '../utils/validation';
import { ErrorHandler } from '../utils/errorHandler';

export class HybridPaginator<T = any> extends BasePaginator<T> {
  private hybridOptions: Required<HybridPaginationOptions<T>>;
  private buttonPaginator: ButtonPaginator<T>;
  private selectMenuPaginator: SelectMenuPaginator<T>;

  constructor(
    interaction: LinxInteraction,
    data: PaginationData<T>,
    options: HybridPaginationOptions<T> = {}
  ) {
    super(interaction, data, options);

    // Validate hybrid options
    ValidationUtils.validateHybridOptions(options);

    const config = getLinxConfig();

    // Set up hybrid-specific options with defaults
    this.hybridOptions = {
      // Base options from parent
      ephemeral: this.options.ephemeral,
      timeout: this.options.timeout,
      pageRenderer: this.options.pageRenderer,
      startPage: this.options.startPage,
      timeoutMessage: this.options.timeoutMessage,
      afterTimeout: this.options.afterTimeout,
      
      // Hybrid-specific options
      enableButtons: options.enableButtons ?? true,
      enableSelectMenu: options.enableSelectMenu ?? true,
      layout: options.layout ?? 'buttons-top',
      
      // Sub-options
      buttonOptions: options.buttonOptions ?? {},
      selectMenuOptions: options.selectMenuOptions ?? {}
    };

    // Ensure at least one component type is enabled
    if (!this.hybridOptions.enableButtons && !this.hybridOptions.enableSelectMenu) {
      throw ErrorHandler.validation(
        'enableButtons/enableSelectMenu', 
        'both false', 
        'at least one to be true'
      );
    }

    // Create child paginators (but don't start them)
    this.buttonPaginator = new ButtonPaginator(interaction, data, {
      ...this.hybridOptions.buttonOptions,
      ephemeral: this.hybridOptions.ephemeral,
      timeout: this.hybridOptions.timeout,
      pageRenderer: this.hybridOptions.pageRenderer,
      startPage: this.hybridOptions.startPage,
      timeoutMessage: this.hybridOptions.timeoutMessage,
      afterTimeout: this.hybridOptions.afterTimeout
    });

    this.selectMenuPaginator = new SelectMenuPaginator(interaction, data, {
      ...this.hybridOptions.selectMenuOptions,
      ephemeral: this.hybridOptions.ephemeral,
      timeout: this.hybridOptions.timeout,
      pageRenderer: this.hybridOptions.pageRenderer,
      startPage: this.hybridOptions.startPage,
      timeoutMessage: this.hybridOptions.timeoutMessage,
      afterTimeout: this.hybridOptions.afterTimeout
    });

    // Sync state with child paginators
    this.syncStateToChildren();
  }

  /**
   * Syncs the current state to child paginators
   */
  private syncStateToChildren(): void {
    // Update button paginator state
    (this.buttonPaginator as any).state.currentPage = this.state.currentPage;
    (this.buttonPaginator as any).state.totalPages = this.state.totalPages;
    (this.buttonPaginator as any).state.data = this.state.data;

    // Update select menu paginator state  
    (this.selectMenuPaginator as any).state.currentPage = this.state.currentPage;
    (this.selectMenuPaginator as any).state.totalPages = this.state.totalPages;
    (this.selectMenuPaginator as any).state.data = this.state.data;
  }

  /**
   * Builds the combined components based on layout
   */
  protected buildComponents(): ActionRowBuilder<any>[] {
    // IMPORTANT: Sync state before building components
    this.syncStateToChildren();
    
    const components: ActionRowBuilder<any>[] = [];
    
    let buttonRows: ActionRowBuilder<ButtonBuilder>[] = [];
    let selectRows: ActionRowBuilder<StringSelectMenuBuilder>[] = [];

    // Get components from child paginators
    if (this.hybridOptions.enableButtons) {
      buttonRows = (this.buttonPaginator as any).buildComponents();
    }

    if (this.hybridOptions.enableSelectMenu) {
      selectRows = (this.selectMenuPaginator as any).buildComponents();
    }

    // Arrange components based on layout
    switch (this.hybridOptions.layout) {
      case 'buttons-top':
        components.push(...buttonRows, ...selectRows);
        break;
        
      case 'buttons-bottom':
        components.push(...selectRows, ...buttonRows);
        break;
        
      case 'select-top':
        components.push(...selectRows, ...buttonRows);
        break;
        
      case 'select-bottom':
        components.push(...buttonRows, ...selectRows);
        break;
        
      default:
        components.push(...buttonRows, ...selectRows);
        break;
    }

    // Validate Discord's 5-row limit
    if (components.length > 5) {
      console.warn(`[LinxJS] Component rows (${components.length}) exceed Discord's 5-row limit. Some components may not display.`);
      return components.slice(0, 5);
    }

    return components;
  }

  /**
   * Handles component interactions from both buttons and select menus
   */
  protected async handleComponentInteraction(
    componentInteraction: ButtonInteraction | StringSelectMenuInteraction
  ): Promise<void> {
    // Check if the interaction is from the original user
    if (componentInteraction.user.id !== this.interaction.user.id) {
      await componentInteraction.reply({
        content: 'You cannot use this pagination.',
        ephemeral: true
      });
      return;
    }

    // Route to appropriate handler based on component type
    if (componentInteraction.isButton()) {
      await this.handleButtonInteraction(componentInteraction);
    } else if (componentInteraction.isStringSelectMenu()) {
      await this.handleSelectMenuInteraction(componentInteraction);
    }
  }

  /**
   * Handles button interactions
   */
  private async handleButtonInteraction(buttonInteraction: ButtonInteraction): Promise<void> {
    // Delegate to button paginator's handler, but handle the navigation ourselves
    await buttonInteraction.deferUpdate();

    try {
      switch (buttonInteraction.customId) {
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
          if (!buttonInteraction.customId.startsWith('linx_counter_')) {
            this.emit('error', ErrorHandler.component(
              'Button', 
              `Unknown button interaction: ${buttonInteraction.customId}`
            ));
          }
          break;
      }
    } catch (error) {
      this.emit('error', ErrorHandler.handle(error as Error));
    }
  }

  /**
   * Handles select menu interactions
   */
  private async handleSelectMenuInteraction(selectInteraction: StringSelectMenuInteraction): Promise<void> {
    await selectInteraction.deferUpdate();

    try {
      // Get the select menu custom ID from child paginator
      const selectOptions = this.selectMenuPaginator.getSelectMenuOptions();
      
      if (selectInteraction.customId !== selectOptions.customId) {
        this.emit('error', ErrorHandler.component(
          'SelectMenu', 
          `Unknown select menu interaction: ${selectInteraction.customId}`
        ));
        return;
      }

      // Get the selected page
      const selectedValues = selectInteraction.values;
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

  /**
   * Override goToPage to sync child paginators
   */
  async goToPage(page: number): Promise<void> {
    await super.goToPage(page);
    this.syncStateToChildren();
  }

  /**
   * Override nextPage to sync child paginators
   */
  async nextPage(): Promise<void> {
    await super.nextPage();
    this.syncStateToChildren();
  }

  /**
   * Override previousPage to sync child paginators
   */
  async previousPage(): Promise<void> {
    await super.previousPage();
    this.syncStateToChildren();
  }

  /**
   * Override firstPage to sync child paginators
   */
  async firstPage(): Promise<void> {
    await super.firstPage();
    this.syncStateToChildren();
  }

  /**
   * Override lastPage to sync child paginators
   */
  async lastPage(): Promise<void> {
    await super.lastPage();
    this.syncStateToChildren();
  }

  /**
   * Override updateData to sync child paginators
   */
  updateData(newData: PaginationData<T>): void {
    super.updateData(newData);
    
    // Update child paginators with new data
    this.buttonPaginator.updateData(newData);
    this.selectMenuPaginator.updateData(newData);
    
    this.syncStateToChildren();
  }

  /**
   * Updates hybrid-specific options
   */
  updateHybridOptions(newOptions: Partial<HybridPaginationOptions<T>>): void {
    if (!this.state.isActive) {
      throw ErrorHandler.validation('paginator', 'inactive', 'active paginator');
    }

    // Validate new options
    ValidationUtils.validateHybridOptions(newOptions);

    // Update layout
    if (newOptions.layout !== undefined) {
      this.hybridOptions.layout = newOptions.layout;
    }

    // Update enable flags
    if (newOptions.enableButtons !== undefined) {
      this.hybridOptions.enableButtons = newOptions.enableButtons;
    }

    if (newOptions.enableSelectMenu !== undefined) {
      this.hybridOptions.enableSelectMenu = newOptions.enableSelectMenu;
    }

    // Ensure at least one is enabled
    if (!this.hybridOptions.enableButtons && !this.hybridOptions.enableSelectMenu) {
      throw ErrorHandler.validation(
        'enableButtons/enableSelectMenu', 
        'both false', 
        'at least one to be true'
      );
    }

    // Update child paginator options
    if (newOptions.buttonOptions) {
      this.buttonPaginator.updateButtonOptions(newOptions.buttonOptions);
      this.hybridOptions.buttonOptions = { ...this.hybridOptions.buttonOptions, ...newOptions.buttonOptions };
    }

    if (newOptions.selectMenuOptions) {
      this.selectMenuPaginator.updateSelectMenuOptions(newOptions.selectMenuOptions);
      this.hybridOptions.selectMenuOptions = { ...this.hybridOptions.selectMenuOptions, ...newOptions.selectMenuOptions };
    }

    // Update the message with new components
    this.updateMessage().catch(error => {
      this.emit('error', ErrorHandler.handle(error));
    });
  }

  /**
   * Gets current hybrid options
   */
  getHybridOptions(): Readonly<Required<HybridPaginationOptions<T>>> {
    return { ...this.hybridOptions };
  }

  /**
   * Gets the button paginator instance (for advanced usage)
   */
  getButtonPaginator(): ButtonPaginator<T> {
    return this.buttonPaginator;
  }

  /**
   * Gets the select menu paginator instance (for advanced usage)
   */
  getSelectMenuPaginator(): SelectMenuPaginator<T> {
    return this.selectMenuPaginator;
  }

  /**
   * Enables or disables buttons dynamically
   */
  setButtonsEnabled(enabled: boolean): void {
    this.updateHybridOptions({ enableButtons: enabled });
  }

  /**
   * Enables or disables select menu dynamically
   */
  setSelectMenuEnabled(enabled: boolean): void {
    this.updateHybridOptions({ enableSelectMenu: enabled });
  }

  /**
   * Changes the layout dynamically
   */
  setLayout(layout: HybridPaginationOptions<T>['layout']): void {
    this.updateHybridOptions({ layout });
  }

  /**
   * Override stop to stop child paginators as well
   */
  stop(reason: 'timeout' | 'user' | 'error' = 'user'): void {
    super.stop(reason);
    
    // Stop child paginators
    this.buttonPaginator.stop(reason);
    this.selectMenuPaginator.stop(reason);
  }
}