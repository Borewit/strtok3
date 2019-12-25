import { ReadStreamTokenizer } from './ReadStreamTokenizer';
import * as Stream from 'stream';
import { BufferTokenizer } from './BufferTokenizer';
export { EndOfStreamError } from 'then-read-stream';
export {  ITokenizer } from './types';
export { IToken, IGetToken } from '@tokenizer/token';

/**
 * Construct ReadStreamTokenizer from given Stream.
 * Will set fileSize, if provided given Stream has set the .path property/
 * @param stream - Read from Node.js Stream.Readable
 * @param size - If known the 'file' size in bytes, maybe required to calculate the duration.
 * @returns ReadStreamTokenizer
 */
export function fromStream(stream: Stream.Readable, size?: number): ReadStreamTokenizer {
  return new ReadStreamTokenizer(stream, size);
}

/**
 * Construct ReadStreamTokenizer from given Buffer.
 * @param buffer - Buffer to tokenize
 * @returns BufferTokenizer
 */
export function fromBuffer(buffer: Buffer): BufferTokenizer {
  return new BufferTokenizer(buffer);
}
