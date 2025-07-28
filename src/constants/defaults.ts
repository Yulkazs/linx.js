/**
 * Default constants used across the application.
 */

import { ButtonStyle } from 'discord.js';
import { getLinxConfig } from '../config';

export const DISCORD_LIMITS = {
    MAX_BUTTON_PER_ROW: 5,
    MAX_ROWS_PER_MESSAGE: 5,
    MAX_SELECT_OPTIONS: 25,
    MAX_SELECT_PLACEHOLDER_LENGTH: 150,
    MAX_BUTTON_LABEL_LENGTH: 80,
    MAX_SELECT_OPTION_LABEL_LENGTH: 100,
    MAX_SELECT_OPTION_DESCRIPTION_LENGTH: 100,

    MAX_EMBED_TITLE_LENGTH: 256,
    MAX_EMBED_DESCRIPTION_LENGTH: 4096,
    MAX_EMBED_FIELD_NAME_LENGTH: 256,
    MAX_EMBED_FIELD_VALUE_LENGTH: 1024,
    MAX_EMBED_FOOTER_TEXT_LENGTH: 2048,
    MAX_EMBED_AUTHOR_NAME_LENGTH: 256,
    MAX_EMBEDS_PER_MESSAGE: 10,
    MAX_EMBED_TOTAL_LENGTH: 6000,

    MAX_MESSAGE_CONTENT_LENGTH: 2000,

    INTERACTION_TOKEN_LIFETIME: 900000,
    MAX_FOLLOWUP_MESSAGES: 50,
}

export const DEFAULT_PAGINATION = {
  TIMEOUT: 300000,      // 5 minutes
  START_PAGE: 0,
  EPHEMERAL: false,
  DELETE_ON_TIMEOUT: true,
  SHOW_PAGE_COUNTER: true,
  DISABLE_BUTTONS_AT_EDGES: true,
  MAX_OPTIONS_PER_MENU: 25,
  MIN_SELECT_VALUES: 1,
  MAX_SELECT_VALUES: 1
} as const;

export const DEFAULT_BUTTONS = {
  STYLE: ButtonStyle.Primary,
  PREVIOUS_LABEL: 'Previous',
  NEXT_LABEL: 'Next',
  FIRST_LABEL: 'First',
  LAST_LABEL: 'Last',
  STOP_LABEL: 'Stop',

  get PREVIOUS_EMOJI() { 
    try {
      const config = getLinxConfig();
      // Use Unicode fallback if custom emoji fails
      return config.emojis.previous || '⬅️';
    } catch {
      return '⬅️';
    }
  },
  get NEXT_EMOJI() { 
    try {
      const config = getLinxConfig();
      return config.emojis.next || '➡️';
    } catch {
      return '➡️';
    }
  },
  get FIRST_EMOJI() { 
    try {
      const config = getLinxConfig();
      return config.emojis.first || '⏪';
    } catch {
      return '⏪';
    }
  },
  get LAST_EMOJI() { 
    try {
      const config = getLinxConfig();
      return config.emojis.last || '⏩';
    } catch {
      return '⏩';
    }
  },
  get STOP_EMOJI() { 
    try {
      const config = getLinxConfig();
      return config.emojis.close || '❌';
    } catch {
      return '❌';
    }
  }
} as const;

export const DEFAULT_SELECT_MENU = {
  PLACEHOLDER: 'Select a page...',
  CUSTOM_ID_PREFIX: 'linx_select',
  MIN_VALUES: 1,
  MAX_VALUES: 1,
  MAX_OPTIONS: 25
} as const;

export const DEFAULT_MESSAGES = {
  get TIMEOUT() { return getLinxConfig().messages.timeout; },
  get NO_DATA() { return getLinxConfig().messages.noData; },
  get ERROR() { return getLinxConfig().messages.error; },
  get LOADING() { return getLinxConfig().messages.loading; },
  get SUCCESS() { return getLinxConfig().messages.success; },
  get INFO() { return getLinxConfig().messages.info; },

  INVALID_PAGE: 'Invalid page number.',
  INTERACTION_FAILED: 'Failed to handle interaction.',
  PERMISSION_DENIED: 'You do not have permission to use this pagination.',
  PAGE_NOT_FOUND: 'Page not found.',
  DATA_LOAD_ERROR: 'Failed to load pagination data.'
} as const;

export const CUSTOM_IDS = {
  BUTTON_PREVIOUS: 'linx_btn_prev',
  BUTTON_NEXT: 'linx_btn_next',
  BUTTON_FIRST: 'linx_btn_first',
  BUTTON_LAST: 'linx_btn_last',
  BUTTON_STOP: 'linx_btn_stop',
  SELECT_MENU: 'linx_select',
  HYBRID_BUTTON: 'linx_hybrid_btn',
  HYBRID_SELECT: 'linx_hybrid_select'
} as const;

export const ERROR_CODES = {
  TIMEOUT: 'LINX_TIMEOUT',
  INVALID_DATA: 'LINX_INVALID_DATA',
  INVALID_INTERACTION: 'LINX_INVALID_INTERACTION',
  PERMISSION_ERROR: 'LINX_PERMISSION_ERROR',
  DISCORD_API_ERROR: 'LINX_DISCORD_API_ERROR',
  VALIDATION_ERROR: 'LINX_VALIDATION_ERROR',
  COMPONENT_ERROR: 'LINX_COMPONENT_ERROR',
  RENDER_ERROR: 'LINX_RENDER_ERROR'
} as const

export const VALIDATION = {
  // Updated Unicode emoji pattern (more comprehensive)
  EMOJI_PATTERN: /^(?:[\u2700-\u27bf]|(?:\ud83c[\udde6-\uddff]){2}|[\ud800-\udbff][\udc00-\udfff]|[\u0023-\u0039]\ufe0f?\u20e3|\u3299|\u3297|\u303d|\u3030|\u24c2|\ud83c[\udd70-\udd71]|\ud83c[\udd7e-\udd7f]|\ud83c\udd8e|\ud83c[\udd91-\udd9a]|\ud83c[\udde6-\uddff]|\ud83c[\ude01-\ude02]|\ud83c\ude1a|\ud83c\ude2f|\ud83c[\ude32-\ude3a]|\ud83c[\ude50-\ude51]|\u203c|\u2049|[\u25aa-\u25ab]|\u25b6|\u25c0|[\u25fb-\u25fe]|\u00a9|\u00ae|\u2122|\u2139|\ud83c\udc04|[\u2600-\u26FF]|\u2b05|\u2b06|\u2b07|\u2b1b|\u2b1c|\u2b50|\u2b55|\u231a|\u231b|\u2328|\u23cf|[\u23e9-\u23f3]|[\u23f8-\u23fa]|\ud83c\udccf|\u2934|\u2935|[\u2190-\u21ff])$/,
  
  // Discord custom emoji pattern: <:name:id> or <a:name:id> for animated
  DISCORD_EMOJI_PATTERN: /^<a?:\w+:\d{17,19}>$/,
  
  CUSTOM_ID_PATTERN: /^[a-zA-Z0-9_-]{1,100}$/,
  PAGE_NUMBER_PATTERN: /^\d+$/
} as const;

export const PERFORMANCE = {
  MAX_CONCURRENT_PAGINATORS: 50,
  CACHE_SIZE: 100,
  DEBOUNCE_DELAY: 100,      // 100ms debounce for interactions
  MAX_RENDER_TIME: 5000,    // 5 seconds
  CLEANUP_INTERVAL: 60000   // 1 minute
} as const;

export const FEATURES = {
  ENABLE_PLUGINS: true,
  ENABLE_CACHING: true,
  ENABLE_ANALYTICS: false,
  ENABLE_DEBUG_MODE: false,
  ENABLE_PERFORMANCE_MONITORING: false
} as const;