import { AbstractTokenizer } from './AbstractTokenizer.js';
import { EndOfStreamError } from 'peek-readable';
import type {IRandomAccessTokenizer, IRandomAccessFileInfo, IReadChunkOptions, ITokenizerOptions} from './types.js';
import { type FileHandle, open as fsOpen } from 'node:fs/promises';

interface IFileTokenizerOptions extends ITokenizerOptions {
  /**
   * Pass additional file information to the tokenizer
   */
  fileInfo: IRandomAccessFileInfo;
}

export class FileTokenizer extends AbstractTokenizer implements IRandomAccessTokenizer {

  public fileInfo: IRandomAccessFileInfo;

  /**
   * Create tokenizer from provided file path
   * @param sourceFilePath File path
   */
  static async fromFile(sourceFilePath: string): Promise<FileTokenizer> {
    const fileHandle = await fsOpen(sourceFilePath, 'r');
    const stat = await fileHandle.stat();
    return new FileTokenizer(fileHandle, {fileInfo: {path: sourceFilePath, size: stat.size}});
  }

  protected constructor(private fileHandle: FileHandle, options: IFileTokenizerOptions) {
    super(options);
    this.fileInfo = options.fileInfo;
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
    const res = await this.fileHandle.read(uint8Array, 0, normOptions.length, normOptions.position);
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

    const res = await this.fileHandle.read(uint8Array, 0, normOptions.length, normOptions.position);
    if ((!normOptions.mayBeLess) && res.bytesRead < normOptions.length) {
      throw new EndOfStreamError();
    }
    return res.bytesRead;
  }

  public async close(): Promise<void> {
    await this.fileHandle.close();
    return super.close();
  }

  setPosition(position: number): void {
    this.position = position;
  }

  supportsRandomAccess(): boolean {
    return true;
  }
}


