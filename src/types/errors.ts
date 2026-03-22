/**
 * Error codes for Thetanuts SDK errors
 */
export type ThetanutsErrorCode =
  | 'ORDER_EXPIRED'
  | 'SLIPPAGE_EXCEEDED'
  | 'INSUFFICIENT_ALLOWANCE'
  | 'INSUFFICIENT_BALANCE'
  | 'NETWORK_UNSUPPORTED'
  | 'HTTP_ERROR'
  | 'BAD_REQUEST'
  | 'NOT_FOUND'
  | 'RATE_LIMIT'
  | 'CONTRACT_REVERT'
  | 'INVALID_PARAMS'
  | 'INVALID_ORDER'
  | 'ORDER_NOT_FOUND'
  | 'SIZE_EXCEEDED'
  | 'SIGNER_REQUIRED'
  | 'WEBSOCKET_ERROR'
  | 'KEY_NOT_FOUND'
  | 'INVALID_KEY'
  | 'ENCRYPTION_FAILED'
  | 'DECRYPTION_FAILED'
  | 'UNKNOWN';

/**
 * Base error class for all Thetanuts SDK errors.
 * Supports `instanceof` checks for specific error types.
 *
 * @example
 * ```typescript
 * try {
 *   await client.optionBook.fillOrder(order);
 * } catch (error) {
 *   if (error instanceof ThetanutsError) {
 *     console.log(error.code); // e.g. 'CONTRACT_REVERT'
 *   }
 *   if (error instanceof ContractRevertError) {
 *     // handle contract revert specifically
 *   }
 * }
 * ```
 */
export class ThetanutsError extends Error {
  readonly code: ThetanutsErrorCode;
  readonly meta?: Record<string, unknown>;

  constructor(code: ThetanutsErrorCode, message: string, cause?: unknown, meta?: Record<string, unknown>) {
    super(message);
    this.name = 'ThetanutsError';
    this.code = code;
    if (cause !== undefined) {
      this.cause = cause;
    }
    if (meta !== undefined) {
      this.meta = meta;
    }
  }
}

// ============ API Errors ============

/**
 * Base class for HTTP API errors
 */
export class APIError extends ThetanutsError {
  readonly status: number;

  constructor(status: number, code: ThetanutsErrorCode, message: string, cause?: unknown, meta?: Record<string, unknown>) {
    super(code, message, cause, meta);
    this.name = 'APIError';
    this.status = status;
  }
}

/** HTTP 400 - Bad Request */
export class BadRequestError extends APIError {
  constructor(message = 'Bad request', cause?: unknown, meta?: Record<string, unknown>) {
    super(400, 'BAD_REQUEST', message, cause, meta);
    this.name = 'BadRequestError';
  }
}

/** HTTP 404 - Not Found */
export class NotFoundError extends APIError {
  constructor(message = 'Not found', cause?: unknown, meta?: Record<string, unknown>) {
    super(404, 'NOT_FOUND', message, cause, meta);
    this.name = 'NotFoundError';
  }
}

/** HTTP 429 - Rate Limit Exceeded */
export class RateLimitError extends APIError {
  constructor(message = 'Rate limit exceeded', cause?: unknown, meta?: Record<string, unknown>) {
    super(429, 'RATE_LIMIT', message, cause, meta);
    this.name = 'RateLimitError';
  }
}

// ============ Contract Errors ============

/** Smart contract call failed */
export class ContractRevertError extends ThetanutsError {
  constructor(message = 'Contract call failed', cause?: unknown, meta?: Record<string, unknown>) {
    super('CONTRACT_REVERT', message, cause, meta);
    this.name = 'ContractRevertError';
  }
}

/** Insufficient ERC20 token allowance */
export class InsufficientAllowanceError extends ThetanutsError {
  constructor(message = 'Insufficient token allowance. Please approve tokens first.', cause?: unknown) {
    super('INSUFFICIENT_ALLOWANCE', message, cause);
    this.name = 'InsufficientAllowanceError';
  }
}

/** Insufficient ERC20 token balance */
export class InsufficientBalanceError extends ThetanutsError {
  constructor(message = 'Insufficient token balance.', cause?: unknown) {
    super('INSUFFICIENT_BALANCE', message, cause);
    this.name = 'InsufficientBalanceError';
  }
}

/** Order has expired */
export class OrderExpiredError extends ThetanutsError {
  constructor(message = 'Order has expired.', cause?: unknown) {
    super('ORDER_EXPIRED', message, cause);
    this.name = 'OrderExpiredError';
  }
}

/** Price slippage exceeded tolerance */
export class SlippageExceededError extends ThetanutsError {
  constructor(message = 'Price slippage exceeded tolerance.', cause?: unknown) {
    super('SLIPPAGE_EXCEEDED', message, cause);
    this.name = 'SlippageExceededError';
  }
}

// ============ Client Errors ============

/** Signer required for write operations */
export class SignerRequiredError extends ThetanutsError {
  constructor(message = 'Signer is required for this operation.') {
    super('SIGNER_REQUIRED', message);
    this.name = 'SignerRequiredError';
  }
}

/** Invalid parameters provided */
export class InvalidParamsError extends ThetanutsError {
  constructor(message: string, cause?: unknown) {
    super('INVALID_PARAMS', message, cause);
    this.name = 'InvalidParamsError';
  }
}

/** Network not supported */
export class NetworkUnsupportedError extends ThetanutsError {
  constructor(message = 'Network not supported.') {
    super('NETWORK_UNSUPPORTED', message);
    this.name = 'NetworkUnsupportedError';
  }
}

/** WebSocket connection error */
export class WebSocketError extends ThetanutsError {
  constructor(message = 'WebSocket error.', cause?: unknown) {
    super('WEBSOCKET_ERROR', message, cause);
    this.name = 'WebSocketError';
  }
}

// ============ RFQ Key Manager Errors ============

/** RFQ key not found in storage */
export class KeyNotFoundError extends ThetanutsError {
  constructor(message = 'No RFQ key found in storage. Generate one with generateKeyPair() or getOrCreateKeyPair().') {
    super('KEY_NOT_FOUND', message);
    this.name = 'KeyNotFoundError';
  }
}

/** Invalid key format */
export class InvalidKeyError extends ThetanutsError {
  constructor(message = 'Invalid key format.', cause?: unknown) {
    super('INVALID_KEY', message, cause);
    this.name = 'InvalidKeyError';
  }
}

/** Encryption failed */
export class EncryptionError extends ThetanutsError {
  constructor(message = 'Failed to encrypt offer data.', cause?: unknown) {
    super('ENCRYPTION_FAILED', message, cause);
    this.name = 'EncryptionError';
  }
}

/** Decryption failed */
export class DecryptionError extends ThetanutsError {
  constructor(message = 'Failed to decrypt offer data. Key mismatch or corrupted data.', cause?: unknown) {
    super('DECRYPTION_FAILED', message, cause);
    this.name = 'DecryptionError';
  }
}

/**
 * Type guard to check if an error is a ThetanutsError
 */
export function isThetanutsError(error: unknown): error is ThetanutsError {
  return error instanceof ThetanutsError;
}
