import { ReadStreamTokenizer } from './ReadStreamTokenizer.js';
import { BufferTokenizer } from './BufferTokenizer.js';
import { StreamReader, WebStreamReader } from 'peek-readable';
import type { ITokenizerOptions } from './types.js';
import type { ReadableStream as NodeReadableStream, ReadableStream } from 'node:stream/web';
import type { Readable } from 'node:stream';

export { EndOfStreamError } from 'peek-readable';
export type { ITokenizer, IFileInfo, ITokenizerOptions, IReadChunkOptions, OnClose } from './types.js';
export type { IToken, IGetToken } from '@tokenizer/token';
export { AbstractTokenizer } from './AbstractTokenizer.js';

export type AnyWebByteStream = NodeReadableStream<Uint8Array> | ReadableStream<Uint8Array>;

/**
 * Construct ReadStreamTokenizer from given Stream.
 * Will set fileSize, if provided given Stream has set the .path property/
 * @param stream - Read from Node.js Stream.Readable
 * @param options - Tokenizer options
 * @returns ReadStreamTokenizer
 */
export function fromStream(stream: Readable, options?: ITokenizerOptions): ReadStreamTokenizer {
  return new ReadStreamTokenizer(new StreamReader(stream), options);
}

/**
 * Construct ReadStreamTokenizer from given ReadableStream (WebStream API).
 * Will set fileSize, if provided given Stream has set the .path property/
 * @param webStream - Read from Node.js Stream.Readable (must be a byte stream)
 * @param options - Tokenizer options
 * @returns ReadStreamTokenizer
 */
export function fromWebStream(webStream: AnyWebByteStream, options?: ITokenizerOptions): ReadStreamTokenizer {
  return new ReadStreamTokenizer(new WebStreamReader(webStream), options);
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
