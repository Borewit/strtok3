import { ITokenizer, IFileInfo, IReadChunkOptions } from './types';
import { EndOfStreamError } from 'peek-readable';
import { IGetToken, IToken } from '@tokenizer/token';

/**
 * Core tokenizer
 */
export abstract class AbstractTokenizer implements ITokenizer {

  public fileInfo: IFileInfo;

  protected constructor(fileInfo?: IFileInfo) {
    this.fileInfo = fileInfo ? fileInfo : {};
  }

  /**
   * Tokenizer-stream position
   */
  public position: number = 0;

  private numBuffer = Buffer.alloc(10);

  /**
   * Read buffer from tokenizer
   * @param buffer - Target buffer to fill with data read from the tokenizer-stream
   * @param options - Additional read options
   * @returns Promise with number of bytes read
   */
  public abstract readBuffer(buffer: Buffer | Uint8Array, options?: IReadChunkOptions): Promise<number>;

  /**
   * Peek (read ahead) buffer from tokenizer
   * @param buffer - Target buffer to fill with data peek from the tokenizer-stream
   * @param options - Peek behaviour options
   * @returns Promise with number of bytes read
   */
  public abstract peekBuffer(buffer: Buffer | Uint8Array, options?: IReadChunkOptions): Promise<number>;

  /**
   * Read a token from the tokenizer-stream
   * @param token - The token to read
   * @param position - If provided, the desired position in the tokenizer-stream
   * @returns Promise with token data
   */
  public async readToken<T>(token: IGetToken<T>, position?: number): Promise<T> {
    const buffer = Buffer.alloc(token.len);
    const len = await this.readBuffer(buffer, {position});
    if (len < token.len)
      throw new EndOfStreamError();
    return token.get(buffer, 0);
  }

  /**
   * Peek a token from the tokenizer-stream.
   * @param token - Token to peek from the tokenizer-stream.
   * @param position - Offset where to begin reading within the file. If position is null, data will be read from the current file position.
   * @returns Promise with token data
   */
  public async peekToken<T>(token: IGetToken<T>, position: number = this.position): Promise<T> {
    const buffer = Buffer.alloc(token.len);
    const len = await this.peekBuffer(buffer, {position});
    if (len < token.len)
      throw new EndOfStreamError();
    return token.get(buffer, 0);
  }

  /**
   * Read a numeric token from the stream
   * @param token - Numeric token
   * @returns Promise with number
   */
  public async readNumber(token: IToken<number>): Promise<number> {
    const len = await this.readBuffer(this.numBuffer, {length: token.len});
    if (len < token.len)
      throw new EndOfStreamError();
    return token.get(this.numBuffer, 0);
  }

  /**
   * Read a numeric token from the stream
   * @param token - Numeric token
   * @returns Promise with number
   */
  public async peekNumber(token: IToken<number>): Promise<number> {
    const len = await this.peekBuffer(this.numBuffer, {length: token.len});
    if (len < token.len)
      throw new EndOfStreamError();
    return token.get(this.numBuffer, 0);
  }

  /**
   * Ignore number of bytes, advances the pointer in under tokenizer-stream.
   * @param length - Number of bytes to skip (ignore)
   * @return actual number of bytes ignored
   */
  public abstract ignore(length: number): Promise<number>;

  public async close(): Promise<void> {
    // empty
  }

}
