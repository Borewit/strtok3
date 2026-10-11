import type { Readable } from 'node:stream';
import { BlobTokenizer } from './BlobTokenizer.js';
import { BufferTokenizer } from './BufferTokenizer.js';
import { ReadStreamTokenizer } from './ReadStreamTokenizer.js';
import { type AnyWebByteStream, makeWebStreamReader, StreamReader } from './stream/index.js';
import type { ITokenizerOptions } from './types.js';

export type { IGetToken, IToken } from '@tokenizer/token';
export { AbstractTokenizer } from './AbstractTokenizer.js';
export { AbortError, type AnyWebByteStream, EndOfStreamError } from './stream/index.js';
export type {
  IFileInfo,
  IRandomAccessFileInfo,
  IRandomAccessTokenizer,
  IReadChunkOptions,
  ITokenizer,
  ITokenizerOptions,
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
  const streamReader = new StreamReader(stream);
  const _options: ITokenizerOptions = options ?? {};
  const chainedClose = _options.onClose;
  _options.onClose = async () => {
    await streamReader.close();
    if (chainedClose) {
      return chainedClose();
    }
  };
  return new ReadStreamTokenizer(streamReader, _options);
}

/**
 * Construct ReadStreamTokenizer from given ReadableStream (WebStream API).
 * Will set fileSize, if provided given Stream has set the .path property/
 * @param webStream - Read from Node.js Stream.Readable (must be a byte stream)
 * @param options - Tokenizer options
 * @returns ReadStreamTokenizer
 */
export function fromWebStream(webStream: AnyWebByteStream, options?: ITokenizerOptions): ReadStreamTokenizer {
  const webStreamReader = makeWebStreamReader(webStream);
  const _options: ITokenizerOptions = options ?? {};
  const chainedClose = _options.onClose;
  _options.onClose = async () => {
    await webStreamReader.close();
    if (chainedClose) {
      return chainedClose();
    }
  };
  return new ReadStreamTokenizer(webStreamReader, _options);
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
