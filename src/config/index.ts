/**
 * Configuration system for linx.js
 */

import { ButtonStyle } from 'discord.js';

export interface LinxConfig {
    emojis: {
        previous: string;
        next: string;
        first: string;
        last: string;
        close: string;

        error: string;
        loading: string;
        success: string;
        info: string;
    };
    defaults: {
        timeout: number;
        ephemeral: boolean;
        buttonStyle: ButtonStyle;
        deleteOnTimeout: boolean;
        showPageCounter: boolean;
        disableButtonsAtEdges: boolean;
        maxOptionsPerMenu: number;
    };
    messages: {
        timeout: string;
        noData: string;
        error: string;
        loading: string;
        success: string;
        info: string;
    };
}

const defaultConfig: LinxConfig = {
    emojis: {
        previous: '<:linx_prev:1398768319279927457>',
        next: '<:linx_next:1398768007861370911>',
        first: '<:linx_first:1398768009132376094>',
        last: '<:linx_last:1398768006087053322>',
        close: '<:linx_close:1398768001284833343>',

        error: '<:linx_error:1398768004661248030>',
        loading: '<a:linx_loading:1398767995081199758>',
        success: '<:linx_check:1398768003117748224>',
        info: '<:linx_info:1398767997878927431>',
    },
    defaults: {
        timeout: 300000,
        ephemeral: false,
        buttonStyle: ButtonStyle.Primary,
        deleteOnTimeout: true,
        showPageCounter: true,
        disableButtonsAtEdges: true,
        maxOptionsPerMenu: 25,
    },
    messages: {
        timeout: 'This pagination has timed out.',
        noData: 'No data available to paginate.',
        error: 'An error occurred while processing your request.',
        loading: 'Loading data, please wait...',
        success: 'Completed successfully.',
        info: 'Here is the information you requested.',
    }
};

let currentConfig: LinxConfig = { ...defaultConfig };

export function configureLinx(config: Partial<LinxConfig>): void {
    if (config.emojis) {
        currentConfig.emojis = { ...currentConfig.emojis, ...config.emojis };
    }
    
    if (config.defaults) {
        currentConfig.defaults = { ...currentConfig.defaults, ...config.defaults };
    }
    
    if (config.messages) {
        currentConfig.messages = { ...currentConfig.messages, ...config.messages };
    }
};

// Get the current configuration
export function getLinxConfig(): LinxConfig {
    return currentConfig;
}

// Reset the configuration to default values
export function resetLinxConfig(): void {
    currentConfig = { ...defaultConfig };
}

// Emoji setters for convenience
export function setEmojis(emojis: Partial<LinxConfig['emojis']>): void {
    currentConfig.emojis = { ...currentConfig.emojis, ...emojis };
}

// Default timeout and ephemeral settings
export function setTimeout(timeout: number): void {
    currentConfig.defaults.timeout = timeout;
}

export function setEphemeral(ephemeral: boolean): void {
    currentConfig.defaults.ephemeral = ephemeral;
}

