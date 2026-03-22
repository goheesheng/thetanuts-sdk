import {
  ThetanutsError,
  APIError,
  BadRequestError,
  NotFoundError,
  RateLimitError,
  ContractRevertError,
  InsufficientAllowanceError,
  InsufficientBalanceError,
  OrderExpiredError,
  SlippageExceededError,
  isThetanutsError,
} from '../types/errors.js';
import type { ThetanutsErrorCode } from '../types/errors.js';

/**
 * Create a ThetanutsError with the specified code and message.
 * Returns a proper ThetanutsError class instance that supports `instanceof`.
 */
export function createError(
  code: ThetanutsErrorCode,
  message: string,
  cause?: unknown,
  meta?: Record<string, unknown>
): ThetanutsError {
  return new ThetanutsError(code, message, cause, meta);
}

/**
 * Wrap an unknown error as a ThetanutsError
 */
export function wrapError(
  error: unknown,
  defaultCode: ThetanutsErrorCode = 'UNKNOWN',
  defaultMessage?: string
): ThetanutsError {
  if (isThetanutsError(error)) {
    return error;
  }

  if (error instanceof Error) {
    const message = defaultMessage ?? error.message;
    return createError(defaultCode, message, error);
  }

  const message = defaultMessage ?? String(error);
  return createError(defaultCode, message, error);
}

/**
 * Map HTTP/fetch errors to typed ThetanutsError subclasses.
 * Returns `BadRequestError`, `NotFoundError`, `RateLimitError`, or `APIError`.
 */
export function mapHttpError(error: unknown): ThetanutsError {
  if (error instanceof Error && 'response' in error) {
    const axiosError = error as Error & {
      response?: { status?: number; data?: unknown };
      config?: { url?: string };
    };

    const status = axiosError.response?.status;
    const url = axiosError.config?.url ?? 'unknown';

    if (status === 400) {
      return new BadRequestError(
        `Invalid request parameters: ${error.message}`,
        error,
        { status, url, data: axiosError.response?.data }
      );
    }

    if (status === 404) {
      return new NotFoundError(
        `Resource not found: ${url}`,
        error,
        { status, url }
      );
    }

    if (status === 429) {
      return new RateLimitError(
        `Rate limit exceeded: ${url}`,
        error,
        { status, url }
      );
    }

    return new APIError(
      status ?? 0,
      'HTTP_ERROR',
      `HTTP error ${status ?? 'unknown'}: ${error.message}`,
      error,
      { status, url }
    );
  }

  return wrapError(error, 'HTTP_ERROR', 'HTTP request failed');
}

/**
 * Map contract/ethers errors to typed ThetanutsError subclasses.
 * Returns `InsufficientAllowanceError`, `InsufficientBalanceError`,
 * `OrderExpiredError`, `SlippageExceededError`, or `ContractRevertError`.
 */
export function mapContractError(error: unknown): ThetanutsError {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    if (message.includes('insufficient allowance') || message.includes('erc20: insufficient allowance')) {
      return new InsufficientAllowanceError(
        'Insufficient token allowance. Please approve tokens first.',
        error
      );
    }

    if (message.includes('insufficient balance') || message.includes('erc20: transfer amount exceeds balance')) {
      return new InsufficientBalanceError(
        'Insufficient token balance.',
        error
      );
    }

    if (message.includes('expired') || message.includes('order expired')) {
      return new OrderExpiredError('Order has expired.', error);
    }

    if (message.includes('slippage') || message.includes('price changed')) {
      return new SlippageExceededError('Price slippage exceeded tolerance.', error);
    }

    return new ContractRevertError(`Contract call failed: ${error.message}`, error);
  }

  return wrapError(error, 'CONTRACT_REVERT', 'Contract call failed');
}
