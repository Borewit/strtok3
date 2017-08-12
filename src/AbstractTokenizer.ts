import {IGetToken, IToken} from 'token-types';
import {ITokenizer} from "./";

export abstract class AbstractTokenizer implements ITokenizer {

  public fileSize?: number;

  private numBuffer = new Buffer(4);

  /**
   * Read buffer from tokenizer
   * @param buffer
   * @param offset is the offset in the buffer to start writing at; if not provided, start at 0
   * @param length is an integer specifying the number of bytes to read
   * @param position is an integer specifying where to begin reading from in the file. If position is null, data will be read from the current file position.
   * @returns {Promise<TResult|number>}
   */
  public abstract readBuffer(buffer: Buffer | Uint8Array, offset?: number, length?: number, position?: number): Promise<number>;

  /**
   * Peek (read ahead) buffer from tokenizer
   * @param buffer
   * @param offset is the offset in the buffer to start writing at; if not provided, start at 0
   * @param length is an integer specifying the number of bytes to read
   * @param position is an integer specifying where to begin reading from in the file. If position is null, data will be read from the current file position.
   * @returns {Promise<TResult|number>}
   */
  public abstract peekBuffer(buffer: Buffer | Uint8Array, offset?: number, length?: number, position?: number): Promise<number>;

  public readToken<T>(token: IGetToken<T>, position: number | null = null): Promise<T> {
    const buffer = new Buffer(token.len);
    return this.readBuffer(buffer, 0, token.len, position).then((res) => {
      return token.get(buffer, 0);
    });
  }

  public peekToken<T>(token: IGetToken<T>, position: number | null = null): Promise<T> {
    const buffer = new Buffer(token.len);
    return this.peekBuffer(buffer, 0, token.len, position).then((res) => {
      return token.get(buffer, 0);
    });
  }

  public readNumber(token: IToken<number>): Promise<number> {
    return this.readBuffer(this.numBuffer, 0, token.len, null).then((res) => {
      return token.get(this.numBuffer, 0);
    });
  }

  public peekNumber(token: IToken<number>): Promise<number> {
    return this.peekBuffer(this.numBuffer, 0, token.len, null).then((res) => {
      return token.get(this.numBuffer, 0);
    });
  }

  public abstract ignore(length: number): Promise<void>;

}
