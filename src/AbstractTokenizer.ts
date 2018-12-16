import { IGetToken, IToken } from 'token-types';
import { endOfFile, ITokenizer } from './type';

export abstract class AbstractTokenizer implements ITokenizer {

  public fileSize?: number;

  public position: number = 0;

  private numBuffer = Buffer.alloc(4);

  /**
   * Read buffer from tokenizer
   * @param buffer
   * @param offset is the offset in the buffer to start writing at; if not provided, start at 0
   * @param length is an integer specifying the number of bytes to read
   * @param position is an integer specifying where to begin reading from in the file. If position is null, data will be read from the current file position.
   * @param maybeless If set, will not throw an EOF error if the less then the requested length could be read
   * @returns {Promise<number>}
   */
  public async abstract readBuffer(buffer: Buffer | Uint8Array, offset?: number, length?: number, position?: number, maybeless?: boolean): Promise<number>;

  /**
   * Peek (read ahead) buffer from tokenizer
   * @param buffer
   * @param offset is the offset in the buffer to start writing at; if not provided, start at 0
   * @param length is an integer specifying the number of bytes to read
   * @param position is an integer specifying where to begin reading from in the file. If position is null, data will be read from the current file position.
   * @param maybeless If set, will not throw an EOF error if the less then the requested length could be read
   * @returns {Promise<number>}
   */
  public async abstract peekBuffer(buffer: Buffer | Uint8Array, offset?: number, length?: number, position?: number, maybeless?: boolean): Promise<number>;

  public async readToken<T>(token: IGetToken<T>, position: number | null = null, maybeless?: boolean): Promise<T> {
    const buffer = Buffer.alloc(token.len);
    const len = await this.readBuffer(buffer, 0, token.len, position);
    if (!maybeless && len < token.len)
      throw new Error(endOfFile);
    return token.get(buffer, 0);
  }

  public async peekToken<T>(token: IGetToken<T>, position: number = this.position, maybeless?: boolean): Promise<T> {
    const buffer = Buffer.alloc(token.len);
    const len = await this.peekBuffer(buffer, 0, token.len, position);
    if (!maybeless && len < token.len)
      throw new Error(endOfFile);
    return token.get(buffer, 0);
  }

  public async readNumber(token: IToken<number>): Promise<number> {
    const len = await this.readBuffer(this.numBuffer, 0, token.len, null);
    if (len < token.len)
      throw new Error(endOfFile);
    return token.get(this.numBuffer, 0);
  }

  public async peekNumber(token: IToken<number>): Promise<number> {
    const len = await this.peekBuffer(this.numBuffer, 0, token.len);
    if (len < token.len)
      throw new Error(endOfFile);
    return token.get(this.numBuffer, 0);
  }

  /**
   * @return actual number of bytes ignored
   */
  public async abstract ignore(length: number): Promise<number>;

  public async close(): Promise<void> {
    // empty
  }

}
