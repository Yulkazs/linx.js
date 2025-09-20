/**
 * Type definitions for linx.js
 * Updated: Better handling of SelectMenuPaginator labeling options
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

// Button configuration - can be just label, just emoji, or both
export type ButtonConfig = string | [string] | [string, string];

// After timeout behavior
export type AfterTimeoutBehavior = 'delete' | 'disable';

// Base pagination options (shared by all paginators)
export interface BasePaginationOptions<T = any> {
  ephemeral?: boolean;
  timeout?: number;
  pageRenderer?: PageRenderer<T>;
  startPage?: number;
  timeoutMessage?: string;
  afterTimeout?: AfterTimeoutBehavior;
}

// Button-specific options with new cleaner API
export interface ButtonPaginationOptions<T = any> extends BasePaginationOptions<T> {
  previous?: ButtonConfig;
  next?: ButtonConfig;
  first?: ButtonConfig;
  last?: ButtonConfig;
  buttonStyle?: ButtonStyle;
  showPageCounter?: boolean;
  showFirstLast?: boolean;
}

/**
 * Select menu labeling options - ONLY USE ONE OF THESE THREE APPROACHES:
 * 
 * Option 1: Page Numbers (default)
 * - labelStyle: 'page-numbers' (or omit entirely)
 * - Results in: "Page 1", "Page 2", "Page 3"...
 * 
 * Option 2: Custom Numbers with Prefix
 * - labelStyle: 'custom-numbers'
 * - customPrefix: string (required) - e.g., "Chapter", "Level", "Step"
 * - customSuffix?: string (optional) - e.g., "- Introduction"
 * - Results in: "Chapter 1", "Level 2", "Step 3 - Introduction"...
 * 
 * Option 3: Fully Custom Labels
 * - optionLabelRenderer: function (overrides everything else)
 * - optionDescriptionRenderer?: function (optional)
 * - Results in: whatever your function returns
 * 
 * If multiple approaches are specified, priority is: Custom Labels > Custom Numbers > Page Numbers
 */

// Select menu-specific options with three distinct labeling approaches
export interface SelectMenuPaginationOptions<T = any> extends BasePaginationOptions<T> {
  placeholder?: string;
  customId?: string;
  minValues?: number;
  maxValues?: number;
  maxOptionsPerMenu?: number;
  
  // APPROACH 1: Page Numbers (default)
  // Use labelStyle: 'page-numbers' or omit entirely
  // Results in: "Page 1", "Page 2", etc.
  
  // APPROACH 2: Custom Numbers with Prefix
  // Use these together for custom numbering
  labelStyle?: 'page-numbers' | 'custom-numbers' | 'custom-labels';
  customPrefix?: string; // Required when labelStyle is 'custom-numbers' (e.g., "Chapter", "Level", "Step")
  customSuffix?: string; // Optional additional text (e.g., "- Introduction")
  
  // APPROACH 3: Fully Custom Labels
  // Use these for complete control over labels and descriptions
  optionLabelRenderer?: (item: T, index: number) => string;
  optionDescriptionRenderer?: (item: T, index: number) => string;
  
  // Auto description settings (apply to approaches 1 & 2)
  autoDescriptions?: boolean; // Automatically generate descriptions from data (default: true)
  descriptionMaxLength?: number; // Max length for auto descriptions (default: 50)
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
  | 'VALIDATION_ERROR'
  | 'COMPONENT_ERROR'
  | 'RENDER_ERROR';

// Plugin system (for future use)
export interface LinxPlugin<T = any> {
  name: string;
  version: string;
  onInstall?: (paginator: any) => void;
  onPageChange?: (paginator: any, newPage: number, oldPage: number) => void;
  onStart?: (paginator: any) => void;
  onEnd?: (paginator: any) => void;
}

// Type guards for select menu options validation
export interface SelectMenuLabelingConfig {
  usePageNumbers: boolean;
  useCustomNumbers: boolean;
  useCustomLabels: boolean;
  hasConflicts: boolean;
}

// Helper type for select menu option validation
export type SelectMenuLabelStyle = 'page-numbers' | 'custom-numbers' | 'custom-labels';

// Enhanced validation result for select menu options
export interface SelectMenuValidationResult {
  finalStyle: SelectMenuLabelStyle;
  warnings: string[];
  errors: string[];
  requiredFields: string[];
}