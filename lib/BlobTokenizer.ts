import { AbstractTokenizer } from './AbstractTokenizer.js';
import { EndOfStreamError } from './stream/index.js';
import type { IRandomAccessFileInfo, IRandomAccessTokenizer, IReadChunkOptions, ITokenizerOptions } from './types.js';

export class BlobTokenizer extends AbstractTokenizer implements IRandomAccessTokenizer {
  public fileInfo: IRandomAccessFileInfo;

  /**
   * Construct BufferTokenizer
   * @param blob - Uint8Array to tokenize
   * @param options Tokenizer options
   */
  constructor(
    private blob: Blob,
    options?: ITokenizerOptions
  ) {
    super(options);
    this.fileInfo = { ...(options?.fileInfo ?? {}), ...{ size: blob.size, mimeType: blob.type } };
  }

  /**
   * Read buffer from tokenizer
   * @param uint8Array - Uint8Array to tokenize
   * @param options - Read behaviour options
   * @returns {Promise<number>}
   */
  public async readBuffer(uint8Array: Uint8Array, options?: IReadChunkOptions): Promise<number> {
    const normOptions = this.normalizeOptions(uint8Array, options);
    const bytesRead = await this.peekBuffer(uint8Array, normOptions);
    this.position = normOptions.position + bytesRead;
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

    const bytes2read = Math.max(0, Math.min(this.blob.size - normOptions.position, normOptions.length));
    if (!normOptions.mayBeLess && bytes2read < normOptions.length) {
      throw new EndOfStreamError();
    }
    for (let offset = 0; offset < bytes2read; ) {
      const chunkLength = Math.min(this.maxBufferSize, bytes2read - offset);
      const position = normOptions.position + offset;
      const arrayBuffer = await this.blob.slice(position, position + chunkLength).arrayBuffer();
      buffer.set(new Uint8Array(arrayBuffer), offset);
      offset += chunkLength;
    }
    return bytes2read;
  }

  public close(): Promise<void> {
    return super.close();
  }

  supportsRandomAccess(): boolean {
    return true;
  }

  setPosition(position: number): void {
    this.validateLength(position, 'position');
    this.position = position;
  }
}
