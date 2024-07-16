import { Readable } from 'node:stream';
import { ReadStreamTokenizer } from './ReadStreamTokenizer.js';
import { stat as fsStat } from 'node:fs/promises';
import { type ITokenizerOptions, fromStream as coreFromStream } from './core.js';

export { fromFile } from './FileTokenizer.js';
export { ITokenizer, EndOfStreamError, fromBuffer, fromWebStream, IFileInfo, ITokenizerOptions, OnClose} from './core.js';
export { IToken, IGetToken } from '@tokenizer/token';

/**
 * Construct ReadStreamTokenizer from given Stream.
 * Will set fileSize, if provided given Stream has set the .path property.
 * @param stream - Node.js Stream.Readable
 * @param options - Pass additional file information to the tokenizer
 * @returns Tokenizer
 */
export async function fromStream(stream: Readable, options?: ITokenizerOptions): Promise<ReadStreamTokenizer> {
  const augmentedOptions: ITokenizerOptions = options ?? {};
  augmentedOptions.fileInfo = augmentedOptions.fileInfo ?? {};
  if ((stream as any).path) {
    const stat = await fsStat((stream as any).path);
    augmentedOptions.fileInfo.path = (stream as any).path;
    augmentedOptions.fileInfo.size = stat.size;
  }
  return coreFromStream(stream, augmentedOptions);
}
