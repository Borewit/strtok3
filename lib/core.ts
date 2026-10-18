import type { Readable } from 'node:stream';
import { throwIfAborted } from './AbortSignal.js';
import { BlobTokenizer } from './BlobTokenizer.js';
import { getMaxBufferSize } from './BufferSizeError.js';
import { BufferTokenizer } from './BufferTokenizer.js';
import { ReadStreamTokenizer } from './ReadStreamTokenizer.js';
import { type AnyWebByteStream, makeWebStreamReader, StreamReader } from './stream/index.js';
import type { ITokenizerOptions } from './types.js';

export type { IGetToken, IToken } from '@tokenizer/token';
export { AbstractTokenizer } from './AbstractTokenizer.js';
export { BufferSizeError } from './BufferSizeError.js';
export { isRandomAccessTokenizer } from './isRandomAccessTokenizer.js';
export { AbortError, type AnyWebByteStream, EndOfStreamError } from './stream/index.js';
export { TokenizerBoundaryError } from './TokenizerBoundaryError.js';
export { createTokenizerView } from './TokenizerView.js';
export type {
  IFileInfo,
  IRandomAccessFileInfo,
  IRandomAccessTokenizer,
  IRandomAccessTokenizerView,
  IReadChunkOptions,
  ITokenizer,
  ITokenizerOptions,
  ITokenizerView,
  OnClose
} from './types.js';

/**
 * Construct ReadStreamTokenizer from given Stream.
 * Will set fileSize, if provided given Stream has set the .path property/
 * @param stream - Read from Node.js Stream.Readable
 * @param options - Tokenizer options
 * @returns ReadStreamTokenizer
 */
export function fromStream(stream: Readable, options?: ITokenizerOptions): ReadStreamTokenizer {
  getMaxBufferSize(options);
  throwIfAborted(options?.abortSignal);
  const streamReader = new StreamReader(stream);
  return new ReadStreamTokenizer(streamReader, options);
}

/**
 * Construct ReadStreamTokenizer from given ReadableStream (WebStream API).
 * Will set fileSize, if provided given Stream has set the .path property/
 * @param webStream - Read from Node.js Stream.Readable (must be a byte stream)
 * @param options - Tokenizer options
 * @returns ReadStreamTokenizer
 */
export function fromWebStream(webStream: AnyWebByteStream, options?: ITokenizerOptions): ReadStreamTokenizer {
  getMaxBufferSize(options);
  throwIfAborted(options?.abortSignal);
  const webStreamReader = makeWebStreamReader(webStream);
  return new ReadStreamTokenizer(webStreamReader, options);
}

/**
 * Construct ReadStreamTokenizer from given Buffer.
 * @param uint8Array - Uint8Array to tokenize
 * @param options - Tokenizer options
 * @returns BufferTokenizer
 */
export function fromBuffer(uint8Array: Uint8Array, options?: ITokenizerOptions): BufferTokenizer {
  return new BufferTokenizer(uint8Array, options);
}

/**
 * Construct ReadStreamTokenizer from given Blob.
 * @param blob - Uint8Array to tokenize
 * @param options - Tokenizer options
 * @returns BufferTokenizer
 */
export function fromBlob(blob: Blob, options?: ITokenizerOptions): BlobTokenizer {
  return new BlobTokenizer(blob, options);
}
