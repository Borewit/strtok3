import type {ITokenizerOptions, IReadChunkOptions, IRandomAccessFileInfo, IRandomAccessTokenizer} from './types.js';
import { EndOfStreamError } from './stream/index.js';
import { AbstractTokenizer } from './AbstractTokenizer.js';

export class BlobTokenizer extends AbstractTokenizer implements IRandomAccessTokenizer {

  public fileInfo: IRandomAccessFileInfo;

  /**
   * Construct BufferTokenizer
   * @param blob - Uint8Array to tokenize
   * @param options Tokenizer options
   */
  constructor(private blob: Blob, options?: ITokenizerOptions) {
    super(options);
    this.fileInfo = {...options?.fileInfo ?? {}, ...{size: blob.size, mimeType: blob.type}};
  }

  /**
   * Read buffer from tokenizer
   * @param uint8Array - Uint8Array to tokenize
   * @param options - Read behaviour options
   * @returns {Promise<number>}
   */
  public async readBuffer(uint8Array: Uint8Array, options?: IReadChunkOptions): Promise<number> {

    if (options?.position) {
      this.position = options.position;
    }

    const bytesRead = await this.peekBuffer(uint8Array, options);
    this.position += bytesRead;
    return bytesRead;
  }

  /**
   * Peek (read ahead) buffer from tokenizer
   * @param buffer
   * @param options - Read behaviour options
   * @returns {Promise<number>}
   */
  public async peekBuffer(buffer: Uint8Array, options?: IReadChunkOptions): Promise<number> {

    const normOptions = this.normalizeOptions(buffer, options);

    const bytes2read = Math.min(this.blob.size - normOptions.position, normOptions.length);
    if ((!normOptions.mayBeLess) && bytes2read < normOptions.length) {
      throw new EndOfStreamError();
    }
    const arrayBuffer = await this.blob.slice(normOptions.position, normOptions.position + bytes2read).arrayBuffer();
    buffer.set(new Uint8Array(arrayBuffer));
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
