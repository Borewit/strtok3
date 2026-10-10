import type { ITokenizerOptions } from './types.js';

/** Thrown before a dynamically sized tokenizer buffer exceeds its configured limit. */
export class BufferSizeError extends RangeError {
  /**
   * Create an error describing an allocation that exceeds the configured limit.
   * @param requestedSize - Requested buffer size in bytes
   * @param maxBufferSize - Configured maximum buffer size in bytes
   */
  constructor(
    public readonly requestedSize: number,
    public readonly maxBufferSize: number
  ) {
    super(`Requested buffer size ${requestedSize} exceeds maxBufferSize ${maxBufferSize}`);
    this.name = 'BufferSizeError';
  }
}

/**
 * Validate options before acquiring file handles or stream readers.
 * @param options - Tokenizer options containing the optional allocation limit
 * @returns Configured buffer limit in bytes, or Infinity when the limit is disabled
 * @throws RangeError if maxBufferSize is neither a positive safe integer nor Infinity
 */
export function getMaxBufferSize(options?: ITokenizerOptions): number {
  const limit = options?.maxBufferSize ?? Number.POSITIVE_INFINITY;
  if (limit !== Number.POSITIVE_INFINITY && (!Number.isSafeInteger(limit) || limit <= 0)) {
    throw new RangeError('maxBufferSize must be a positive safe integer or Infinity');
  }
  return limit;
}
