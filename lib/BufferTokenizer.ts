import type {ITokenizerOptions, IReadChunkOptions, IRandomAccessFileInfo, IRandomAccessTokenizer} from './types.js';
import { EndOfStreamError } from 'peek-readable';
import { AbstractTokenizer } from './AbstractTokenizer.js';

export class BufferTokenizer extends AbstractTokenizer implements IRandomAccessTokenizer {

  public fileInfo: IRandomAccessFileInfo;

  /**
   * Construct BufferTokenizer
   * @param uint8Array - Uint8Array to tokenize
   * @param options Tokenizer options
   */
  constructor(private uint8Array: Uint8Array, options?: ITokenizerOptions) {
    super(options);
    this.fileInfo = {...options?.fileInfo ?? {}, ...{size: uint8Array.length}};
  }

  /**
   * Read buffer from tokenizer
   * @param uint8Array - Uint8Array to tokenize
   * @param options - Read behaviour options
   * @returns {Promise<number>}
   */
  public async readBuffer(uint8Array: Uint8Array, options?: IReadChunkOptions): Promise<number> {

    if (options?.position) {
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

    const normOptions = this.normalizeOptions(uint8Array, options);

    const bytes2read = Math.min(this.uint8Array.length - normOptions.position, normOptions.length);
    if ((!normOptions.mayBeLess) && bytes2read < normOptions.length) {
      throw new EndOfStreamError();
    }
    uint8Array.set(this.uint8Array.subarray(normOptions.position, normOptions.position + bytes2read), normOptions.offset);
    return bytes2read;
  }

  public close(): Promise<void> {
    return super.close();
  }

  supportsRandomAccess(): boolean {
    return true;
  }

  setPosition(position: number): void {
    this.position = position;
  }
}
