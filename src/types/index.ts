/**
 * Type definitions for linx.js
 */

import { 
  CommandInteraction, 
  ButtonInteraction, 
  StringSelectMenuInteraction,
  Message,
  EmbedBuilder,
  ButtonStyle,
} from 'discord.js';

// Base interaction types that linx.js supports
export type LinxInteraction = CommandInteraction | ButtonInteraction | StringSelectMenuInteraction;

// Pagination data can be any type
export type PaginationData<T = any> = T[];

// Function to render each page - returns embed or string
export type PageRenderer<T> = (item: T, index: number, array: T[]) => EmbedBuilder | string;

// Base pagination options (shared by all paginators)
export interface BasePaginationOptions<T = any> {
  ephemeral?: boolean;
  timeout?: number;
  pageRenderer?: PageRenderer<T>;

  startPage?: number;
  deleteOnTimeout?: boolean;
  timeoutMessage?: string;
}

// Button-specific options
export interface ButtonPaginationOptions<T = any> extends BasePaginationOptions<T> {
  previousLabel?: string;
  nextLabel?: string;
  previousEmoji?: string;
  nextEmoji?: string;
  buttonStyle?: ButtonStyle;
  disableButtonsAtEdges?: boolean;
  showPageCounter?: boolean;
}

// Select menu-specific options
export interface SelectMenuPaginationOptions<T = any> extends BasePaginationOptions<T> {
  placeholder?: string;
  customId?: string;
  minValues?: number;
  maxValues?: number;
  
  optionLabelRenderer?: (item: T, index: number) => string;
  optionDescriptionRenderer?: (item: T, index: number) => string;

  maxOptionsPerMenu?: number;
}

// Hybrid pagination options (combines buttons and select menu)
export interface HybridPaginationOptions<T = any> extends BasePaginationOptions<T> {
  enableButtons?: boolean;
  enableSelectMenu?: boolean;

  buttonOptions?: Omit<ButtonPaginationOptions<T>, keyof BasePaginationOptions>;
  selectMenuOptions?: Omit<SelectMenuPaginationOptions<T>, keyof BasePaginationOptions>;

  layout?: 'buttons-top' | 'buttons-bottom' | 'select-top' | 'select-bottom';
}

// Event types that paginators can emit
export interface PaginationEvents<T = any> {
  pageChange: (newPage: number, oldPage: number, data: T) => void;
  start: (initialPage: number, data: T) => void;
  timeout: (lastPage: number, data: T) => void;
  end: (reason: 'timeout' | 'user' | 'error', lastPage: number) => void;
  error: (error: Error) => void;
}

// Paginator state
export interface PaginatorState<T = any> {
  currentPage: number;
  totalPages: number;
  isActive: boolean;
  message?: Message;
  data: T[];
  startedAt: Date;
  timeoutId?: NodeJS.Timeout;
}

// Error types
export type LinxErrorType = 
  | 'TIMEOUT'
  | 'INVALID_DATA' 
  | 'INVALID_INTERACTION'
  | 'PERMISSION_ERROR'
  | 'DISCORD_API_ERROR'
  | 'VALIDATION_ERROR';

// Plugin system (for future use)
export interface LinxPlugin<T = any> {
  name: string;
  version: string;
  onInstall?: (paginator: any) => void;
  onPageChange?: (paginator: any, newPage: number, oldPage: number) => void;
  onStart?: (paginator: any) => void;
  onEnd?: (paginator: any) => void;
}