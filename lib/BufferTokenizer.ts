import { endOfFile, ITokenizer } from './type';
import { IGetToken, IToken } from 'token-types';

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
  public async readBuffer(buffer: Buffer | Uint8Array, offset?: number, length?: number, position?: number): Promise<number> {
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
  public async peekBuffer(buffer: Buffer | Uint8Array, offset?: number, length?: number, position?: number, maybeLess: boolean = false): Promise<number> {
    position = position || this.position;
    if (!length) {
      length = buffer.length;
    }
    const bytes2read = Math.min(this.buffer.length - position, length);
    if (!maybeLess && bytes2read < length) {
      throw new Error(endOfFile);
    } else {
      this.buffer.copy(buffer, offset, position, position + bytes2read);
      return bytes2read;
    }
  }

  public async readToken<T>(token: IGetToken<T>, position?: number): Promise<T> {
    this.position = position || this.position;
    try {
      const tv = this.peekToken(token, this.position);
      this.position += token.len;
      return tv;
    } catch (err) {
      this.position += this.buffer.length - position;
      throw err;
    }
  }

  public async peekToken<T>(token: IGetToken<T>, position: number = this.position): Promise<T> {
    if (this.buffer.length - position < token.len) {
      throw new Error(endOfFile);
    }
    return token.get(this.buffer, position);
  }

  public async readNumber(token: IToken<number>): Promise<number> {
    return this.readToken(token);
  }

  public async peekNumber(token: IToken<number>): Promise<number> {
    return this.peekToken(token);
  }

  /**
   * @return actual number of bytes ignored
   */
  public async ignore(length: number): Promise<number> {
    const bytesIgnored = Math.min(this.buffer.length - this.position, length);
    this.position += bytesIgnored;
    return bytesIgnored;
  }

  public async close(): Promise<void> {
    // empty
  }
}
