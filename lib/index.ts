import { stat as fsStat } from 'node:fs/promises';
import type { Readable } from 'node:stream';
import { fromStream as coreFromStream, type ITokenizerOptions } from './core.js';
import { FileTokenizer } from './FileTokenizer.js';
import type { ReadStreamTokenizer } from './ReadStreamTokenizer.js';

export type { IGetToken, IToken } from '@tokenizer/token';
export * from './core.js';
export { FileTokenizer, type IFromFileOptions } from './FileTokenizer.js';
export { NotRegularFileError } from './NotRegularFileError.js';

interface StreamWithFile extends Readable {
  /**
   * Informal property set by `node:fs.createReadStream`
   */
  path?: string;
  pending?: boolean;
}

async function waitForPendingOpen(stream: StreamWithFile): Promise<void> {
  if (stream.pending !== true || stream.destroyed || stream.errored !== null) {
    return;
  }

  await new Promise<void>(resolve => {
    const settle = (): void => {
      stream.removeListener('open', settle);
      stream.removeListener('error', settle);
      stream.removeListener('close', settle);
      resolve();
    };
    stream.once('open', settle);
    stream.once('error', settle);
    stream.once('close', settle);
  });
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
  try {
    if ((stream as StreamWithFile).path) {
      const stat = await fsStat((stream as StreamWithFile).path as string);
      rst.fileInfo.path = (stream as StreamWithFile).path;
      rst.fileInfo.size = stat.size;
    }
    return rst;
  } catch (error) {
    await waitForPendingOpen(stream as StreamWithFile);
    await rst.close();
    throw error;
  }
}

export const fromFile = FileTokenizer.fromFile;
