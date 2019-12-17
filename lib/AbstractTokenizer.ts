import { IGetToken, IToken } from 'token-types';
import { endOfFile, ITokenizer } from './type';

/**
 * Core tokenizer
 */
export abstract class AbstractTokenizer implements ITokenizer {

  /**
   * Total file or stream length in bytes
   */
  public fileSize?: number;

  /**
   * Tokenizer-stream position
   */
  public position: number = 0;

  private numBuffer = Buffer.alloc(10);

  /**
   * Read buffer from tokenizer
   * @param buffer - Target buffer to fill with data read from the tokenizer-stream
   * @param offset - Offset in the buffer to start writing at; if not provided, start at 0
   * @param length - The number of bytes to read
   * @param position - Offset where to begin reading within the file. If position is null, data will be read from the current file position.
   * @param maybeless - If set, will not throw an EOF error if not all of the requested data could be read
   * @returns Promise with number of bytes read
   */
  public async abstract readBuffer(buffer: Buffer | Uint8Array, offset?: number, length?: number, position?: number, maybeless?: boolean): Promise<number>;

  /**
   * Peek (read ahead) buffer from tokenizer
   * @param buffer - Target buffer to fill with data peek from the tokenizer-stream
   * @param offset - The offset in the buffer to start writing at; if not provided, start at 0
   * @param length - The number of bytes to read
   * @param position - Offset where to begin reading within the file. If position is null, data will be read from the current file position.
   * @param maybeless - If set, will not throw an EOF error if not all of the requested data could be read
   * @returns Promise with number of bytes read
   */
  public async abstract peekBuffer(buffer: Buffer | Uint8Array, offset?: number, length?: number, position?: number, maybeless?: boolean): Promise<number>;

  /**
   * Read a token from the tokenizer-stream
   * @param token - The token to read
   * @param position - If provided, the desired position in the tokenizer-stream
   * @param maybeless - If set, will not throw an EOF error if not all of the requested data could be read
   * @returns Promise with token data
   */
  public async readToken<T>(token: IGetToken<T>, position: number | null = null, maybeless?: boolean): Promise<T> {
    const buffer = Buffer.alloc(token.len);
    const len = await this.readBuffer(buffer, 0, token.len, position);
    if (!maybeless && len < token.len)
      throw new Error(endOfFile);
    return token.get(buffer, 0);
  }

  /**
   * Peek a token from the tokenizer-stream.
   * @param token - Token to peek from the tokenizer-stream.
   * @param position - Offset where to begin reading within the file. If position is null, data will be read from the current file position.
   * @param maybeless - If set, will not throw an EOF error if the less then the requested length could be read.
   * @returns Promise with token data
   */
  public async peekToken<T>(token: IGetToken<T>, position: number = this.position, maybeless?: boolean): Promise<T> {
    const buffer = Buffer.alloc(token.len);
    const len = await this.peekBuffer(buffer, 0, token.len, position);
    if (!maybeless && len < token.len)
      throw new Error(endOfFile);
    return token.get(buffer, 0);
  }

  /**
   * Read a numeric token from the stream
   * @param token - Numeric token
   * @returns Promise with number
   */
  public async readNumber(token: IToken<number>): Promise<number> {
    const len = await this.readBuffer(this.numBuffer, 0, token.len, null);
    if (len < token.len)
      throw new Error(endOfFile);
    return token.get(this.numBuffer, 0);
  }

  /**
   * Read a numeric token from the stream
   * @param token - Numeric token
   * @returns Promise with number
   */
  public async peekNumber(token: IToken<number>): Promise<number> {
    const len = await this.peekBuffer(this.numBuffer, 0, token.len);
    if (len < token.len)
      throw new Error(endOfFile);
    return token.get(this.numBuffer, 0);
  }

  /**
   * Ignore number of bytes, advances the pointer in under tokenizer-stream.
   * @param length - Number of bytes to skip (ignore)
   * @return actual number of bytes ignored
   */
  public async abstract ignore(length: number): Promise<number>;

  public async close(): Promise<void> {
    // empty
  }

}
