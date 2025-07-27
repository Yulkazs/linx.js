/**
 * Base paginator class that provides core functionality for all paginator types
 */

import { 
  EmbedBuilder, 
  Message, 
  InteractionResponse,
  ActionRowBuilder,
  ButtonBuilder,
  StringSelectMenuBuilder,
  ComponentType
} from 'discord.js';
import { EventEmitter } from 'events';

import { 
  LinxInteraction, 
  PaginationData, 
  PageRenderer, 
  BasePaginationOptions,
  PaginatorState,
  PaginationEvents 
} from '../types';
import { getLinxConfig } from '../config';
import { DEFAULT_PAGINATION, DEFAULT_MESSAGES } from '../constants/defaults';
import { ValidationUtils } from '../utils/validation';
import { ErrorHandler, LinxError } from '../utils/errorHandler';

export abstract class BasePaginator<T = any> extends EventEmitter {
  protected state: PaginatorState<T>;
  protected options: Required<BasePaginationOptions<T>>;
  protected interaction: LinxInteraction;
  protected collector?: any;

  constructor(
    interaction: LinxInteraction,
    data: PaginationData<T>,
    options: BasePaginationOptions<T> = {}
  ) {
    super();

    // Validate inputs
    ValidationUtils.validateInteraction(interaction);
    ValidationUtils.validatePaginationData(data);

    this.interaction = interaction;
    
    // Merge options with defaults from config
    const config = getLinxConfig();
    this.options = {
      ephemeral: options.ephemeral ?? config.defaults.ephemeral,
      timeout: options.timeout ?? config.defaults.timeout,
      startPage: options.startPage ?? DEFAULT_PAGINATION.START_PAGE,
      deleteOnTimeout: options.deleteOnTimeout ?? DEFAULT_PAGINATION.DELETE_ON_TIMEOUT,
      timeoutMessage: options.timeoutMessage ?? config.messages.timeout,
      pageRenderer: options.pageRenderer ?? this.defaultPageRenderer.bind(this)
    };

    // Validate merged options
    if (this.options.timeout) {
      ValidationUtils.validateTimeout(this.options.timeout);
    }

    if (this.options.pageRenderer) {
      ValidationUtils.validatePageRenderer(this.options.pageRenderer);
    }

    // Initialize state
    this.state = {
      currentPage: Math.min(this.options.startPage, data.length - 1),
      totalPages: data.length,
      isActive: false,
      data: [...data],
      startedAt: new Date(),
      timeoutId: undefined
    };

    // Validate start page
    if (this.state.currentPage >= 0) {
      ValidationUtils.validatePageNumber(this.state.currentPage, this.state.totalPages);
    }
  }

  // Default page renderer
  protected defaultPageRenderer(item: T, index: number, array: T[]): EmbedBuilder | string {
    if (typeof item === 'string') {
      return item;
    }
    
    if (item && typeof item === 'object') {
      const embed = new EmbedBuilder()
        .setTitle(`Page ${index + 1} of ${array.length}`)
        .setDescription(JSON.stringify(item, null, 2))
        .setTimestamp();
      return embed;
    }

    return `Page ${index + 1}: ${String(item)}`;
  }

  //Renders the current page
  protected renderCurrentPage(): EmbedBuilder | string {
    try {
      const currentItem = this.state.data[this.state.currentPage];
      const rendered = this.options.pageRenderer(
        currentItem, 
        this.state.currentPage, 
        this.state.data
      );

      // Validate rendered content
      if (rendered instanceof EmbedBuilder) {
        ValidationUtils.validateEmbed(rendered);
      } else if (typeof rendered === 'string') {
        ValidationUtils.validateMessageContent(rendered);
      } else {
        throw ErrorHandler.render(
          this.state.currentPage, 
          'Page renderer must return EmbedBuilder or string'
        );
      }

      return rendered;
    } catch (error) {
      const linxError = ErrorHandler.handle(error as Error);
      this.emit('error', linxError);
      throw ErrorHandler.render(
        this.state.currentPage, 
        `Failed to render page: ${linxError.message}`,
        { error }
      );
    }
  }

  // Builds the components for the paginator
  protected abstract buildComponents(): ActionRowBuilder<any>[];

  protected buildMessagePayload() {
    const content = this.renderCurrentPage();
    const components = this.buildComponents();

    if (content instanceof EmbedBuilder) {
      return {
        embeds: [content],
        components,
        ephemeral: this.options.ephemeral
      };
    } else {
      return {
        content,
        components,
        ephemeral: this.options.ephemeral
      };
    }
  }

  // Starts the paginator and sends the initial message
  async start(): Promise<Message | InteractionResponse> {
    if (this.state.isActive) {
      throw ErrorHandler.validation('paginator', 'already active', 'inactive paginator');
    }

    try {
      this.state.isActive = true;
      this.state.startedAt = new Date();

      const payload = this.buildMessagePayload();
      let response: Message | InteractionResponse;

      // Send initial message
      if (this.interaction.replied || this.interaction.deferred) {
        response = await this.interaction.editReply(payload);
      } else {
        response = await this.interaction.reply(payload);
      }

      // Store message reference
      if (response instanceof Message) {
        this.state.message = response;
      } else {
        this.state.message = await this.interaction.fetchReply() as Message;
      }

      this.setupTimeout();
      this.setupCollector();
      this.emit('start', this.state.currentPage, this.state.data[this.state.currentPage]);

      return response;
    } catch (error) {
      this.state.isActive = false;
      const linxError = ErrorHandler.handle(error as Error);
      this.emit('error', linxError);
      throw linxError;
    }
  }

  protected setupTimeout(): void {
    if (this.options.timeout <= 0) return;

    this.state.timeoutId = setTimeout(() => {
      this.handleTimeout();
    }, this.options.timeout);
  }

  protected setupCollector(): void {
    if (!this.state.message) return;

    this.collector = this.state.message.createMessageComponentCollector({
      time: this.options.timeout
    });

    this.collector.on('collect', async (componentInteraction: any) => {
      try {
        await this.handleComponentInteraction(componentInteraction);
      } catch (error) {
        this.emit('error', ErrorHandler.handle(error as Error));
      }
    });

    this.collector.on('end', () => {
      this.handleCollectorEnd();
    });
  }

  // Handles component interactions
  protected abstract handleComponentInteraction(componentInteraction: any): Promise<void>;

  protected async handleTimeout(): Promise<void> {
    try {
      this.emit('timeout', this.state.currentPage, this.state.data[this.state.currentPage]);

      if (this.options.deleteOnTimeout && this.state.message) {
        await this.state.message.delete().catch(() => {});
      } else if (this.state.message) {
        // Disable all components
        const payload = this.buildMessagePayload();
        payload.components = this.disableAllComponents(payload.components);
        
        // Update with timeout message
        const timeoutPayload = { ...payload };
        if (timeoutPayload.content) {
          timeoutPayload.content = this.options.timeoutMessage;
        } else if (timeoutPayload.embeds?.[0]) {
          const embed = EmbedBuilder.from(timeoutPayload.embeds[0]);
          embed.setFooter({ text: this.options.timeoutMessage });
          timeoutPayload.embeds = [embed];
        }

        await this.state.message.edit(timeoutPayload).catch(() => {});
      }
    } catch (error) {
      this.emit('error', ErrorHandler.handle(error as Error));
    } finally {
      this.stop('timeout');
    }
  }

  // Handles the end of the collector
  protected handleCollectorEnd(): void {
    if (this.state.isActive) {
      this.stop('timeout');
    }
  }

  // Disables all components in the paginator
  protected disableAllComponents(components: ActionRowBuilder<any>[]): ActionRowBuilder<any>[] {
    return components.map(row => {
      const newRow = new ActionRowBuilder();
      
      row.components.forEach(component => {
        if (component instanceof ButtonBuilder) {
          newRow.addComponents(ButtonBuilder.from(component.toJSON()).setDisabled(true));
        } else if (component instanceof StringSelectMenuBuilder) {
          newRow.addComponents(StringSelectMenuBuilder.from(component.toJSON()).setDisabled(true));
        }
      });

      return newRow;
    });
  }

  // Goes to a specific page
  async goToPage(page: number): Promise<void> {
    if (!this.state.isActive) {
      throw ErrorHandler.validation('paginator', 'inactive', 'active paginator');
    }

    ValidationUtils.validatePageNumber(page, this.state.totalPages);

    const oldPage = this.state.currentPage;
    this.state.currentPage = page;

    try {
      await this.updateMessage();
      this.emit('pageChange', page, oldPage, this.state.data[page]);
    } catch (error) {
      this.state.currentPage = oldPage;
      throw ErrorHandler.handle(error as Error);
    }
  }

  // Goes to the next page
  async nextPage(): Promise<void> {
    if (this.state.currentPage < this.state.totalPages - 1) {
      await this.goToPage(this.state.currentPage + 1);
    }
  }

  // Goes to the previous page
  async previousPage(): Promise<void> {
    if (this.state.currentPage > 0) {
      await this.goToPage(this.state.currentPage - 1);
    }
  }

  // Goes to the first page
  async firstPage(): Promise<void> {
    await this.goToPage(0);
  }

  // Goes to the last page
  async lastPage(): Promise<void> {
    await this.goToPage(this.state.totalPages - 1);
  }

  // Updates the message with the current page content
  protected async updateMessage(): Promise<void> {
    if (!this.state.message) return;

    const payload = this.buildMessagePayload();
    await this.state.message.edit(payload);
  }

  //
  stop(reason: 'timeout' | 'user' | 'error' = 'user'): void {
    if (!this.state.isActive) return;

    this.state.isActive = false;

    if (this.state.timeoutId) {
      clearTimeout(this.state.timeoutId);
      this.state.timeoutId = undefined;
    }

    // Stop collector
    if (this.collector) {
      this.collector.stop();
    }

    this.emit('end', reason, this.state.currentPage);
  }

  // Gets the current paginator state
  getState(): Readonly<PaginatorState<T>> {
    return { ...this.state };
  }

  // Gets the current page data
  getCurrentPageData(): T {
    return this.state.data[this.state.currentPage];
  }

  // Checks if there is a next page
  hasNextPage(): boolean {
    return this.state.currentPage < this.state.totalPages - 1;
  }

  // Checks if there is a previous page
  hasPreviousPage(): boolean {
    return this.state.currentPage > 0;
  }

  // Updates the paginator data with new data
  updateData(newData: PaginationData<T>): void {
    ValidationUtils.validatePaginationData(newData);
    
    this.state.data = [...newData];
    this.state.totalPages = newData.length;
    
    // Adjust current page if necessary
    if (this.state.currentPage >= this.state.totalPages) {
      this.state.currentPage = Math.max(0, this.state.totalPages - 1);
    }

    // Update message if active
    if (this.state.isActive) {
      this.updateMessage().catch(error => {
        this.emit('error', ErrorHandler.handle(error));
      });
    }
  }

  // Event emitter methods
  on<K extends keyof PaginationEvents<T>>(event: K, listener: PaginationEvents<T>[K]): this {
    return super.on(event, listener);
  }

  emit<K extends keyof PaginationEvents<T>>(event: K, ...args: Parameters<PaginationEvents<T>[K]>): boolean {
    return super.emit(event, ...args);
  }
}