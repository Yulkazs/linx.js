/**
 * Error handling utilities for linx.js
 */

import { ERROR_CODES } from '../constants/defaults';

export type LinxErrorCode = keyof typeof ERROR_CODES;

export class LinxError extends Error {
  public readonly code: string;
  public readonly timestamp: Date;
  public readonly context?: any;

  constructor(
    code: LinxErrorCode,
    message: string,
    context?: any
  ) {
    super(message);
    this.name = 'LinxError';
    this.code = ERROR_CODES[code];
    this.timestamp = new Date();
    this.context = context;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, LinxError);
    }
  }
}

export class LinxTimeoutError extends LinxError {
  constructor(timeout: number, context?: any) {
    super('TIMEOUT', `Pagination timed out after ${timeout}ms`, context);
    this.name = 'LinxTimeoutError';
  }
}

export class LinxValidationError extends LinxError {
  constructor(field: string, value: any, expected: string, context?: any) {
    super('VALIDATION_ERROR', `Invalid ${field}: expected ${expected}, got ${typeof value === 'object' ? JSON.stringify(value) : value}`, context);
    this.name = 'LinxValidationError';
  }
}

export class LinxPermissionError extends LinxError {
  constructor(userId: string, requiredPermission: string, context?: any) {
    super('PERMISSION_ERROR', `User ${userId} lacks required permission: ${requiredPermission}`, context);
    this.name = 'LinxPermissionError';
  }
}

export class LinxDiscordAPIError extends LinxError {
  constructor(apiError: Error, context?: any) {
    super('DISCORD_API_ERROR', `Discord API error: ${apiError.message}`, { ...context, originalError: apiError });
    this.name = 'LinxDiscordAPIError';
  }
}

export class LinxComponentError extends LinxError {
  constructor(componentType: string, reason: string, context?: any) {
    super('COMPONENT_ERROR', `${componentType} component error: ${reason}`, context);
    this.name = 'LinxComponentError';
  }
}

export class LinxRenderError extends LinxError {
  constructor(pageIndex: number, reason: string, context?: any) {
    super('RENDER_ERROR', `Failed to render page ${pageIndex}: ${reason}`, context);
    this.name = 'LinxRenderError';
  }
}

/**
 * Error handler utility functions
 */
export class ErrorHandler {
  private static logError(error: LinxError): void {
    console.error(`[${error.code}] ${error.message}`, {
      timestamp: error.timestamp,
      context: error.context,
      stack: error.stack
    });
  }

  //Handles errors gracefully with optional logging
  static handle(error: Error | LinxError, shouldLog: boolean = true): LinxError {
    if (error instanceof LinxError) {
      if (shouldLog) this.logError(error);
      return error;
    }

    // Convert generic errors to LinxError
    const linxError = new LinxError('DISCORD_API_ERROR', error.message, { originalError: error });
    if (shouldLog) this.logError(linxError);
    return linxError;
  }

  // Creates a timeout error
  static timeout(timeout: number, context?: any): LinxTimeoutError {
    return new LinxTimeoutError(timeout, context);
  }

  // Creates a validation error
  static validation(field: string, value: any, expected: string, context?: any): LinxValidationError {
    return new LinxValidationError(field, value, expected, context);
  }

  // Creates a permission error 
  static permission(userId: string, requiredPermission: string, context?: any): LinxPermissionError {
    return new LinxPermissionError(userId, requiredPermission, context);
  }

  // Creates a Discord API error
  static discordAPI(apiError: Error, context?: any): LinxDiscordAPIError {
    return new LinxDiscordAPIError(apiError, context);
  }

  // Creates a component error
  static component(componentType: string, reason: string, context?: any): LinxComponentError {
    return new LinxComponentError(componentType, reason, context);
  }

  // Creates a render error
  static render(pageIndex: number, reason: string, context?: any): LinxRenderError {
    return new LinxRenderError(pageIndex, reason, context);
  }

  // Wraps async functions
  static async wrap<T>(
    fn: () => Promise<T>, 
    errorType: LinxErrorCode = 'DISCORD_API_ERROR',
    context?: any
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (error instanceof LinxError) {
        throw error;
      }
      throw new LinxError(errorType, (error as Error).message, { ...context, originalError: error });
    }
  }

  // Checks if an error is a specific LinxError type
  static isLinxError(error: any, code?: LinxErrorCode): error is LinxError {
    if (!(error instanceof LinxError)) return false;
    if (!code) return true;
    return error.code === ERROR_CODES[code];
  }
}