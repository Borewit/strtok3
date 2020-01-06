import { ReadStreamTokenizer } from './ReadStreamTokenizer';
import * as Stream from 'stream';
import { BufferTokenizer } from './BufferTokenizer';
import { IFileInfo } from './types';
export { EndOfStreamError } from 'peek-readable';
export { ITokenizer, IFileInfo } from './types';
export { IToken, IGetToken } from '@tokenizer/token';

/**
 * Construct ReadStreamTokenizer from given Stream.
 * Will set fileSize, if provided given Stream has set the .path property/
 * @param stream - Read from Node.js Stream.Readable
 * @param fileInfo - Pass the file information, like size and MIME-type of the correspnding stream.
 * @returns ReadStreamTokenizer
 */
export function fromStream(stream: Stream.Readable, fileInfo?: IFileInfo): ReadStreamTokenizer {
  fileInfo = fileInfo ? fileInfo : {};
  return new ReadStreamTokenizer(stream, fileInfo);
}

/**
 * Construct ReadStreamTokenizer from given Buffer.
 * @param buffer - Buffer to tokenize
 * @param fileInfo - Pass additional file information to the tokenizer
 * @returns BufferTokenizer
 */
export function fromBuffer(buffer: Buffer, fileInfo?: IFileInfo): BufferTokenizer {
  return new BufferTokenizer(buffer, fileInfo);
}
