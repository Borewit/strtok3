import { IFileInfo, IReadChunkOptions } from './types';
import { EndOfStreamError } from 'peek-readable';
import { AbstractTokenizer } from './AbstractTokenizer';

export class BufferTokenizer extends AbstractTokenizer {

  /**
   * Construct BufferTokenizer
   * @param uint8Array - Uint8Array to tokenize
   * @param fileInfo - Pass additional file information to the tokenizer
   */
  constructor(private uint8Array: Uint8Array, fileInfo?: IFileInfo) {
    super(fileInfo);
    this.fileInfo.size = this.fileInfo.size ?  this.fileInfo.size : uint8Array.length;
  }

  /**
   * Read buffer from tokenizer
   * @param uint8Array - Uint8Array to tokenize
   * @param options - Read behaviour options
   * @returns {Promise<number>}
   */
  public async readBuffer(uint8Array: Uint8Array, options?: IReadChunkOptions): Promise<number> {

    if (options && options.position) {
      if (options.position < this.position) {
        throw new Error('`options.position` must be equal or greater than `tokenizer.position`');
      }
      this.position = options.position;
    }

    const bytesRead = await this.peekBuffer(uint8Array, options);
    this.position += bytesRead;
    return bytesRead;
  }

  /**
   * Peek (read ahead) buffer from tokenizer
   * @param uint8Array
   * @param options - Read behaviour options
   * @returns {Promise<number>}
   */
  public async peekBuffer(uint8Array: Uint8Array, options?: IReadChunkOptions): Promise<number> {

    options = this.normalizeOptions(uint8Array, options);

    const bytes2read = Math.min(this.uint8Array.length - options.position, options.length);
    if ((!options.mayBeLess) && bytes2read < options.length) {
      throw new EndOfStreamError();
    } else {
      uint8Array.set(this.uint8Array.subarray(options.position, options.position + bytes2read), options.offset);
      return bytes2read;
    }
  }

  public async close(): Promise<void> {
    // empty
  }
}
