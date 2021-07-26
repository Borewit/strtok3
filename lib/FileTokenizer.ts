import { AbstractTokenizer } from './AbstractTokenizer.js';
import { EndOfStreamError } from 'peek-readable';
import * as fs from './FsPromise.js';
import { IFileInfo, IReadChunkOptions } from './types';

export class FileTokenizer extends AbstractTokenizer {

  public constructor(private fd: number, fileInfo: IFileInfo) {
    super(fileInfo);
  }

  /**
   * Read buffer from file
   * @param buffer
   * @param options - Read behaviour options
   * @returns Promise number of bytes read
   */
  public async readBuffer(buffer: Buffer, options?: IReadChunkOptions): Promise<number> {

    let offset = 0;
    let length = buffer.length;

    if (options) {
      if (options.position) {
        if (options.position < this.position) {
          throw new Error('`options.position` must be equal or greater than `tokenizer.position`');
        }
        this.position = options.position;
      }
      if (Number.isInteger(options.length)) {
        length = options.length;
      } else {
        length -= options.offset || 0;
      }
      if (options.offset) {
        offset = options.offset;
      }
    }
    if (length === 0) {
      return Promise.resolve(0);
    }

    const res = await fs.read(this.fd, buffer, offset, length, this.position);
    this.position += res.bytesRead;
    if (res.bytesRead < length && (!options || !options.mayBeLess)) {
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

    options = this.normalizeOptions(uint8Array, options);

    const res = await fs.read(this.fd, uint8Array, options.offset, options.length, options.position);
    if ((!options.mayBeLess) && res.bytesRead < options.length) {
      throw new EndOfStreamError();
    }
    return res.bytesRead;
  }

  public async close(): Promise<void> {
    return fs.close(this.fd);
  }
}

export async function fromFile(sourceFilePath: string): Promise<FileTokenizer> {
  const stat = await fs.stat(sourceFilePath);
  if (!stat.isFile) {
    throw new Error(`File not a file: ${sourceFilePath}`);
  }
  const fd = await fs.open(sourceFilePath, 'r');
  return new FileTokenizer(fd, {path: sourceFilePath, size: stat.size});
}
