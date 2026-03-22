/**
 * Logger interface for Thetanuts SDK
 * All methods are optional - if not provided, logging is silently skipped
 */
export interface ThetanutsLogger {
  debug?(msg: string, meta?: unknown): void;
  info?(msg: string, meta?: unknown): void;
  warn?(msg: string, meta?: unknown): void;
  error?(msg: string, meta?: unknown): void;
}
