import type { Readable } from 'node:stream';
import { StreamReader, makeWebStreamReader, type AnyWebByteStream } from './stream/index.js';

import { ReadStreamTokenizer } from './ReadStreamTokenizer.js';
import { BufferTokenizer } from './BufferTokenizer.js';
import type { ITokenizerOptions } from './types.js';

export { EndOfStreamError, AbortError, type AnyWebByteStream } from './stream/index.js';
export type { ITokenizer, IRandomAccessTokenizer, IFileInfo, IRandomAccessFileInfo, ITokenizerOptions, IReadChunkOptions, OnClose } from './types.js';
export type { IToken, IGetToken } from '@tokenizer/token';
export { AbstractTokenizer } from './AbstractTokenizer.js';

/**
 * Construct ReadStreamTokenizer from given Stream.
 * Will set fileSize, if provided given Stream has set the .path property/
 * @param stream - Read from Node.js Stream.Readable
 * @param options - Tokenizer options
 * @returns ReadStreamTokenizer
 */
export function fromStream(stream: Readable, options?: ITokenizerOptions): ReadStreamTokenizer {
  const streamReader= new StreamReader(stream);
  const _options: ITokenizerOptions = options ?? {};
  const chainedClose = _options.onClose;
  _options.onClose = async () => {
    await streamReader.close();
    if(chainedClose) {
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
  const webStreamReader= makeWebStreamReader(webStream);
  const _options: ITokenizerOptions = options ?? {};
  const chainedClose = _options.onClose;
  _options.onClose = async () => {
    await webStreamReader.close();
    if(chainedClose) {
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
