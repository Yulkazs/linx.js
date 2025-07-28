/**
 * Configuration system for linx.js
 */

import { ButtonStyle } from 'discord.js';
import { ValidationUtils } from '../utils/validation';
import { ErrorHandler } from '../utils/errorHandler';

export interface LinxConfig {
    emojis: {
        previous: string;
        next: string;
        first: string;
        last: string;
        close: string;
    };
    defaults: {
        timeout: number;
        ephemeral: boolean;
        buttonStyle: ButtonStyle;
        deleteOnTimeout: boolean;
        showPageCounter: boolean;
        disableButtonsAtEdges: boolean;
        maxOptionsPerMenu: number;
        startPage: number;
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

// Use Unicode emojis as defaults since they work everywhere
const defaultConfig: LinxConfig = {
    emojis: {
        previous: '⬅️',
        next: '➡️', 
        first: '⏪',
        last: '⏩',
        close: '❌',
    },
    defaults: {
        timeout: 300000, // 5 minutes
        ephemeral: false,
        buttonStyle: ButtonStyle.Primary,
        deleteOnTimeout: false,
        showPageCounter: true,
        disableButtonsAtEdges: true,
        maxOptionsPerMenu: 25,
        startPage: 0,
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

let currentConfig: LinxConfig = JSON.parse(JSON.stringify(defaultConfig));

//Configure linx.js with custom settings
export function configureLinx(config: Partial<LinxConfig>): void {
    try {
        // Validate the configuration before applying
        if (config.emojis) {
            validateEmojis(config.emojis);
            currentConfig.emojis = { ...currentConfig.emojis, ...config.emojis };
        }
        
        if (config.defaults) {
            validateDefaults(config.defaults);
            currentConfig.defaults = { ...currentConfig.defaults, ...config.defaults };
        }
        
        if (config.messages) {
            validateMessages(config.messages);
            currentConfig.messages = { ...currentConfig.messages, ...config.messages };
        }
    } catch (error) {
        throw ErrorHandler.validation('config', config, 'valid LinxConfig object');
    }
}

//Get the current configuration
export function getLinxConfig(): LinxConfig {
    return currentConfig;
}

// Reset the configuration to default values
export function resetLinxConfig(): void {
    currentConfig = JSON.parse(JSON.stringify(defaultConfig));
}

//Convenience function to set custom emojis
export function setEmojis(emojis: Partial<LinxConfig['emojis']>): void {
    validateEmojis(emojis);
    currentConfig.emojis = { ...currentConfig.emojis, ...emojis };
}

// Convenience function to set timeout
export function setTimeout(timeout: number): void {
    ValidationUtils.validateTimeout(timeout);
    currentConfig.defaults.timeout = timeout;
}

// Convenience function to set ephemeral default
export function setEphemeral(ephemeral: boolean): void {
    if (typeof ephemeral !== 'boolean') {
        throw ErrorHandler.validation('ephemeral', ephemeral, 'boolean');
    }
    currentConfig.defaults.ephemeral = ephemeral;
}

// Convenience function to set button style
export function setButtonStyle(style: ButtonStyle): void {
    ValidationUtils.validateButtonStyle(style);
    currentConfig.defaults.buttonStyle = style;
}

//Get a specific config value with type safety
export function getConfigValue<K extends keyof LinxConfig>(
    section: K
): LinxConfig[K];
export function getConfigValue<K extends keyof LinxConfig, T extends keyof LinxConfig[K]>(
    section: K, 
    key: T
): LinxConfig[K][T];
export function getConfigValue<K extends keyof LinxConfig, T extends keyof LinxConfig[K]>(
    section: K, 
    key?: T
): LinxConfig[K] | LinxConfig[K][T] {
    if (key !== undefined) {
        return currentConfig[section][key];
    }
    return currentConfig[section];
}

// Validation functions
function validateEmojis(emojis: Partial<LinxConfig['emojis']>): void {
    for (const [key, emoji] of Object.entries(emojis)) {
        if (emoji !== undefined) {
            try {
                ValidationUtils.validateEmoji(emoji);
            } catch (error) {
                throw ErrorHandler.validation(`emojis.${key}`, emoji, 'valid Discord emoji');
            }
        }
    }
}

function validateDefaults(defaults: Partial<LinxConfig['defaults']>): void {
    if (defaults.timeout !== undefined) {
        ValidationUtils.validateTimeout(defaults.timeout);
    }
    
    if (defaults.buttonStyle !== undefined) {
        ValidationUtils.validateButtonStyle(defaults.buttonStyle);
    }
    
    if (defaults.ephemeral !== undefined && typeof defaults.ephemeral !== 'boolean') {
        throw ErrorHandler.validation('defaults.ephemeral', defaults.ephemeral, 'boolean');
    }
    
    if (defaults.deleteOnTimeout !== undefined && typeof defaults.deleteOnTimeout !== 'boolean') {
        throw ErrorHandler.validation('defaults.deleteOnTimeout', defaults.deleteOnTimeout, 'boolean');
    }
    
    if (defaults.showPageCounter !== undefined && typeof defaults.showPageCounter !== 'boolean') {
        throw ErrorHandler.validation('defaults.showPageCounter', defaults.showPageCounter, 'boolean');
    }
    
    if (defaults.disableButtonsAtEdges !== undefined && typeof defaults.disableButtonsAtEdges !== 'boolean') {
        throw ErrorHandler.validation('defaults.disableButtonsAtEdges', defaults.disableButtonsAtEdges, 'boolean');
    }
    
    if (defaults.maxOptionsPerMenu !== undefined) {
        if (!Number.isInteger(defaults.maxOptionsPerMenu) || defaults.maxOptionsPerMenu < 1 || defaults.maxOptionsPerMenu > 25) {
            throw ErrorHandler.validation('defaults.maxOptionsPerMenu', defaults.maxOptionsPerMenu, 'integer between 1 and 25');
        }
    }
    
    if (defaults.startPage !== undefined) {
        if (!Number.isInteger(defaults.startPage) || defaults.startPage < 0) {
            throw ErrorHandler.validation('defaults.startPage', defaults.startPage, 'non-negative integer');
        }
    }
}

function validateMessages(messages: Partial<LinxConfig['messages']>): void {
    for (const [key, message] of Object.entries(messages)) {
        if (message !== undefined && typeof message !== 'string') {
            throw ErrorHandler.validation(`messages.${key}`, message, 'string');
        }
    }
}