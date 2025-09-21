//Type definitions for linx.js SelectMenuPaginator
//Simplified labeling system with validation

import { 
  CommandInteraction, 
  ButtonInteraction, 
  StringSelectMenuInteraction,
  Message,
  EmbedBuilder,
  ButtonStyle,
} from 'discord.js';

//Base interaction types that linx.js supports
export type LinxInteraction = CommandInteraction | ButtonInteraction | StringSelectMenuInteraction;

//Pagination data can be any type
export type PaginationData<T = any> = T[];

//Function to render each page - returns embed or string
export type PageRenderer<T> = (item: T, index: number, array: T[]) => EmbedBuilder | string;

//After timeout behavior
export type AfterTimeoutBehavior = 'delete' | 'disable';

//Custom label renderer function
export type CustomLabelRenderer<T> = (item: T, index: number) => {
  label: string;
  description?: string;
};

export type LabelOption = 
  | 'PageNumbers'  
  | ['CustomNumbers', string]       
  | ['CustomNumbers', string, string]                       
  | ['CustomNumbers', '', string]                          
  | 'CustomLabels';                                         

//Base pagination options
export interface BasePaginationOptions<T = any> {
  ephemeral?: boolean;
  timeout?: number;
  pageRenderer?: PageRenderer<T>;
  startPage?: number;
  timeoutMessage?: string;
  afterTimeout?: AfterTimeoutBehavior;
}

//SelectMenuPaginator options with simplified labeling system
export interface SelectMenuPaginationOptions<T = any> extends BasePaginationOptions<T> {
  // Basic select menu configuration
  placeholder?: string;
  customId?: string;
  minValues?: number;
  maxValues?: number;
  maxOptionsPerMenu?: number;
  labelOption?: LabelOption;
  
  // Required when labelOption is 'CustomLabels'
  customLabelRenderer?: CustomLabelRenderer<T>;
  
  // Auto description settings (applies to PageNumbers and CustomNumbers)
  autoDescriptions?: boolean;
  descriptionMaxLength?: number;
}

//Button configuration - can be just label, just emoji, or both
export type ButtonConfig = string | [string] | [string, string];

//Button-specific options
export interface ButtonPaginationOptions<T = any> extends BasePaginationOptions<T> {
  previous?: ButtonConfig;
  next?: ButtonConfig;
  first?: ButtonConfig;
  last?: ButtonConfig;
  buttonStyle?: ButtonStyle;
  showPageCounter?: boolean;
  showFirstLast?: boolean;
}

//Hybrid pagination options (combines buttons and select menu)
export interface HybridPaginationOptions<T = any> extends BasePaginationOptions<T> {
  enableButtons?: boolean;
  enableSelectMenu?: boolean;

  buttonOptions?: Omit<ButtonPaginationOptions<T>, keyof BasePaginationOptions>;
  selectMenuOptions?: Omit<SelectMenuPaginationOptions<T>, keyof BasePaginationOptions>;

  layout?: 'buttons-top' | 'buttons-bottom' | 'select-top' | 'select-bottom';
}

//Event types that paginators can emit
export interface PaginationEvents<T = any> {
  pageChange: (newPage: number, oldPage: number, data: T) => void;
  start: (initialPage: number, data: T) => void;
  timeout: (lastPage: number, data: T) => void;
  end: (reason: 'timeout' | 'user' | 'error', lastPage: number) => void;
  error: (error: Error) => void;
}

//Paginator state
export interface PaginatorState<T = any> {
  currentPage: number;
  totalPages: number;
  isActive: boolean;
  message?: Message;
  data: T[];
  startedAt: Date;
  timeoutId?: NodeJS.Timeout;
}

//Error types
export type LinxErrorType = 
  | 'TIMEOUT'
  | 'INVALID_DATA' 
  | 'INVALID_INTERACTION'
  | 'PERMISSION_ERROR'
  | 'DISCORD_API_ERROR'
  | 'VALIDATION_ERROR'
  | 'COMPONENT_ERROR'
  | 'RENDER_ERROR';

//Common data structure interface for select menu items
export interface SelectMenuDataItem {
  title?: string;
  name?: string;
  label?: string;
  description?: string;
  content?: string;
  [key: string]: any;
}

//Pre-built interfaces for common use cases
export interface HelpSection extends SelectMenuDataItem {
  title: string;
  content: string;
  category?: string;
}

export interface UserLevel extends SelectMenuDataItem {
  name: string;
  level: number;
  xp?: number;
  benefits?: string;
  requirements?: string;
}

export interface GameFeature extends SelectMenuDataItem {
  name: string;
  description: string;
  icon?: string;
  available?: boolean;
}

export interface DocumentationSection extends SelectMenuDataItem {
  title: string;
  content: string;
  category: string;
  tags?: string[];
}

//Internal configuration for label parsing (used by SelectMenuPaginator)
export interface InternalLabelConfig {
  type: 'page-numbers' | 'custom-numbers' | 'custom-labels';
  prefix?: string;
  suffix?: string;
  customRenderer?: CustomLabelRenderer<any>;
}

//Label configuration info for debugging
export interface LabelConfigurationInfo {
  type: 'page-numbers' | 'custom-numbers' | 'custom-labels';
  prefix?: string;
  suffix?: string;
  hasCustomRenderer: boolean;
}

//Helper type for select menu label styles
export type SelectMenuLabelStyle = 'page-numbers' | 'custom-numbers' | 'custom-labels';

//Validation result interface
export interface SelectMenuValidationResult {
  finalStyle: SelectMenuLabelStyle;
  warnings: string[];
  errors: string[];
  requiredFields: string[];
}

//Configuration validation interface
export interface SelectMenuLabelingConfig {
  usePageNumbers: boolean;
  useCustomNumbers: boolean;
  useCustomLabels: boolean;
  hasConflicts: boolean;
}

//Plugin system (for future use)
export interface LinxPlugin<T = any> {
  name: string;
  version: string;
  onInstall?: (paginator: any) => void;
  onPageChange?: (paginator: any, newPage: number, oldPage: number) => void;
  onStart?: (paginator: any) => void;
  onEnd?: (paginator: any) => void;
}

export interface LegacySelectMenuPaginationOptions<T = any> extends BasePaginationOptions<T> {
  placeholder?: string;
  customId?: string;
  minValues?: number;
  maxValues?: number;
  maxOptionsPerMenu?: number;
  labelStyle?: 'page-numbers' | 'custom-numbers' | 'custom-labels';
  customPrefix?: string;
  customSuffix?: string;
  optionLabelRenderer?: (item: T, index: number) => string;
  optionDescriptionRenderer?: (item: T, index: number) => string;
  autoDescriptions?: boolean;
  descriptionMaxLength?: number;
}