import type { ThetanutsLogger } from '../types/logger.js';

/**
 * No-op logger implementation that silently discards all log messages
 */
export const noopLogger: ThetanutsLogger = {
  debug: () => undefined,
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
};

/**
 * Console logger implementation for development/debugging
 */
export const consoleLogger: ThetanutsLogger = {
  debug: (msg: string, meta?: unknown) => {
    // eslint-disable-next-line no-console
    console.debug(`[THETANUTS:DEBUG] ${msg}`, meta !== undefined ? meta : '');
  },
  info: (msg: string, meta?: unknown) => {
    // eslint-disable-next-line no-console
    console.info(`[THETANUTS:INFO] ${msg}`, meta !== undefined ? meta : '');
  },
  warn: (msg: string, meta?: unknown) => {
    // eslint-disable-next-line no-console
    console.warn(`[THETANUTS:WARN] ${msg}`, meta !== undefined ? meta : '');
  },
  error: (msg: string, meta?: unknown) => {
    // eslint-disable-next-line no-console
    console.error(`[THETANUTS:ERROR] ${msg}`, meta !== undefined ? meta : '');
  },
};

/**
 * Logger wrapper that safely calls logger methods
 * Handles cases where logger methods may be undefined
 */
export class Logger {
  private logger: ThetanutsLogger;

  constructor(logger?: ThetanutsLogger) {
    this.logger = logger ?? noopLogger;
  }

  debug(msg: string, meta?: unknown): void {
    this.logger.debug?.(msg, meta);
  }

  info(msg: string, meta?: unknown): void {
    this.logger.info?.(msg, meta);
  }

  warn(msg: string, meta?: unknown): void {
    this.logger.warn?.(msg, meta);
  }

  error(msg: string, meta?: unknown): void {
    this.logger.error?.(msg, meta);
  }
}
