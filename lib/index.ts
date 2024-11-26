import type { Readable } from 'node:stream';
import type { ReadStreamTokenizer } from './ReadStreamTokenizer.js';
import { stat as fsStat } from 'node:fs/promises';
import { type ITokenizerOptions, fromStream as coreFromStream } from './core.js';
import {FileTokenizer} from "./FileTokenizer.js";

export { FileTokenizer } from './FileTokenizer.js';
export * from './core.js';
export type { IToken, IGetToken } from '@tokenizer/token';

interface StreamWithFile extends Readable {
  /**
   * Informal property set by `node:fs.createReadStream`
   */
  path?: string;
}

/**
 * Construct ReadStreamTokenizer from given Stream.
 * Will set fileSize, if provided given Stream has set the .path property.
 * @param stream - Node.js Stream.Readable
 * @param options - Pass additional file information to the tokenizer
 * @returns Tokenizer
 */
export async function fromStream(stream: Readable, options?: ITokenizerOptions): Promise<ReadStreamTokenizer> {
  const rst = coreFromStream(stream, options);
  if ((stream as StreamWithFile).path) {
    const stat = await fsStat((stream as StreamWithFile).path as string);
    rst.fileInfo.path = (stream as StreamWithFile).path;
    rst.fileInfo.size = stat.size;
  }
  return rst;
}

export const fromFile = FileTokenizer.fromFile;
