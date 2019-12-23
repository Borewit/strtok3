import * as Stream from "stream";

import * as fs from './FsPromise';
import {ReadStreamTokenizer} from './ReadStreamTokenizer';
import * as core from './core';

export { fromFile } from './FileTokenizer';
export { fromBuffer } from './core';
export { IToken, IFlush, IGetToken, ITokenizer, endOfFile } from './types';

/**
 * Construct ReadStreamTokenizer from given Stream.
 * Will set fileSize, if provided given Stream has set the .path property.
 * @param stream - Node.js Stream.Readable
 * @returns Tokenizer
 */
export async function fromStream(stream: Stream.Readable): Promise<ReadStreamTokenizer> {
  if ((stream as any).path) {
    const stat = await fs.stat((stream as any).path);
    return core.fromStream(stream, stat.size);
  }
  return new ReadStreamTokenizer(stream);
}
