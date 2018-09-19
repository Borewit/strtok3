import {endOfFile, ITokenizer} from "./type";
import {IGetToken, IToken} from "token-types";

export class BufferTokenizer implements ITokenizer {

  public position: number = 0;

  public fileSize: number;

  constructor(private buffer: Buffer) {
    this.fileSize = buffer.length;
  }

  /**
   * Read buffer from tokenizer
   * @param buffer
   * @param offset is the offset in the buffer to start writing at; if not provided, start at 0
   * @param length is an integer specifying the number of bytes to read
   * @param position is an integer specifying where to begin reading from in the file. If position is null, data will be read from the current file position.
   * @returns {Promise<TResult|number>}
   */
  public readBuffer(buffer: Buffer | Uint8Array, offset?: number, length?: number, position?: number): Promise<number> {
    this.position = position || this.position;
    return this.peekBuffer(buffer, offset, length, this.position).then(bytesRead => {
      this.position += bytesRead;
      return bytesRead;
    });
  }

  /**
   * Peek (read ahead) buffer from tokenizer
   * @param buffer
   * @param offset is the offset in the buffer to start writing at; if not provided, start at 0
   * @param length is an integer specifying the number of bytes to read
   * @param position is an integer specifying where to begin reading from in the file. If position is null, data will be read from the current file position.
   * @param maybeLess If true, will return the bytes available if available bytes is less then length.
   * @returns {Promise<TResult|number>}
   */
  public peekBuffer(buffer: Buffer | Uint8Array, offset?: number, length?: number, position?: number, maybeLess: boolean = false): Promise<number> {
    position = position || this.position;
    return new Promise((resolve, reject) => {
      if (!length) {
        length = buffer.length;
      }
      const bytes2read = Math.min(this.buffer.length - position, length);
      if (!maybeLess && bytes2read < length) {
        reject(new Error(endOfFile));
      } else {
        this.buffer.copy(buffer, offset, position, position + bytes2read);
        resolve(bytes2read);
      }
    });
  }

  public readToken<T>(token: IGetToken<T>, position?: number): Promise<T> {
    this.position = position || this.position;
    return this.peekToken(token, this.position).then(tv => {
      this.position += token.len;
      return tv;
    }).catch (err => {
      this.position += this.buffer.length - position;
      throw err;
    });
  }

  public peekToken<T>(token: IGetToken<T>, position: number = this.position): Promise<T> {
    return new Promise((resolve, reject) => {
      if (this.buffer.length - position < token.len) {
        reject(new Error(endOfFile));
      } else {
        resolve(token.get(this.buffer, position));
      }
    });
  }

  public readNumber(token: IToken<number>): Promise<number> {
    return this.readToken(token);
  }

  public peekNumber(token: IToken<number>): Promise<number> {
    return this.peekToken(token);
  }

  /**
   * @return actual number of bytes ignored
   */
  public ignore(length: number): Promise<number> {
    const bytesIgnored = Math.min(this.buffer.length - this.position, length);
    this.position += bytesIgnored;
    return Promise.resolve(bytesIgnored);
  }

  public close(): Promise<void> {
    return Promise.resolve();
  }
}
