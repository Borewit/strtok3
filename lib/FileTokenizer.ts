import { AbstractTokenizer } from './AbstractTokenizer.js';
import { EndOfStreamError } from 'peek-readable';
import type { IReadChunkOptions, ITokenizerOptions } from './types.js';
import { type FileHandle, open as fsOpen } from 'node:fs/promises';

export class FileTokenizer extends AbstractTokenizer {

  public constructor(private fileHandle: FileHandle, options: ITokenizerOptions) {
    super(options);
  }

  /**
   * Read buffer from file
   * @param uint8Array - Uint8Array to write result to
   * @param options - Read behaviour options
   * @returns Promise number of bytes read
   */
  public async readBuffer(uint8Array: Uint8Array, options?: IReadChunkOptions): Promise<number> {
    const normOptions = this.normalizeOptions(uint8Array, options);
    this.position = normOptions.position;
    if (normOptions.length === 0) return 0;
    const res = await this.fileHandle.read(uint8Array, normOptions.offset, normOptions.length, normOptions.position);
    this.position += res.bytesRead;
    if (res.bytesRead < normOptions.length && (!options || !options.mayBeLess)) {
      throw new EndOfStreamError();
    }
    return res.bytesRead;
  }

  /**
   * Peek buffer from file
   * @param uint8Array - Uint8Array (or Buffer) to write data to
   * @param options - Read behaviour options
   * @returns Promise number of bytes read
   */
  public async peekBuffer(uint8Array: Uint8Array, options?: IReadChunkOptions): Promise<number> {

    const normOptions = this.normalizeOptions(uint8Array, options);

    const res = await this.fileHandle.read(uint8Array, normOptions.offset, normOptions.length, normOptions.position);
    if ((!normOptions.mayBeLess) && res.bytesRead < normOptions.length) {
      throw new EndOfStreamError();
    }
    return res.bytesRead;
  }

  public async close(): Promise<void> {
    await this.fileHandle.close();
    return super.close();
  }
}

export async function fromFile(sourceFilePath: string): Promise<FileTokenizer> {
  const fileHandle = await fsOpen(sourceFilePath, 'r');
  const stat = await fileHandle.stat();
  return new FileTokenizer(fileHandle, {fileInfo: {path: sourceFilePath, size: stat.size}});
}
