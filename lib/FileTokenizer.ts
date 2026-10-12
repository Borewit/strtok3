import { constants } from 'node:fs';
import fs, { type FileHandle } from 'node:fs/promises';
import { throwIfAborted } from './AbortSignal.js';
import { AbstractTokenizer } from './AbstractTokenizer.js';
import { getMaxBufferSize } from './BufferSizeError.js';
import { NotRegularFileError } from './NotRegularFileError.js';
import { EndOfStreamError } from './stream/index.js';
import type { IRandomAccessFileInfo, IRandomAccessTokenizer, IReadChunkOptions, ITokenizerOptions } from './types.js';

/** Options for creating a tokenizer from a file path. */
export interface IFromFileOptions extends ITokenizerOptions {
  /**
   * Open without blocking on FIFOs and require the opened handle to refer to a regular file.
   * Rejects with NotRegularFileError for an opened non-regular file and closes its handle.
   * Disabled by default, preserving the existing file-opening behavior.
   */
  regularFileOnly?: boolean;
}

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
   * @param options Tokenizer options
   */
  static async fromFile(sourceFilePath: string, options?: IFromFileOptions): Promise<FileTokenizer> {
    getMaxBufferSize(options);
    throwIfAborted(options?.abortSignal);
    const flags = options?.regularFileOnly ? constants.O_RDONLY | constants.O_NONBLOCK : 'r';
    const fileHandle = await fs.open(sourceFilePath, flags);
    try {
      const stat = await fileHandle.stat();
      if (options?.regularFileOnly && !stat.isFile()) {
        throw new NotRegularFileError(sourceFilePath);
      }

      return new FileTokenizer(fileHandle, {
        ...options,
        fileInfo: { ...options?.fileInfo, path: sourceFilePath, size: stat.size }
      });
    } catch (error) {
      await fileHandle.close();
      throw error;
    }
  }

  protected constructor(
    private fileHandle: FileHandle,
    options: IFileTokenizerOptions
  ) {
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
    if (normOptions.length === 0) {
      return 0;
    }
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
    if (!normOptions.mayBeLess && res.bytesRead < normOptions.length) {
      throw new EndOfStreamError();
    }
    return res.bytesRead;
  }

  public async close(): Promise<void> {
    this.removeAbortListener();
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
