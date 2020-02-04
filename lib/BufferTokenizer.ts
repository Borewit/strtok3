import { IFileInfo, IReadChunkOptions, ITokenizer } from './types';
import { EndOfStreamError } from 'peek-readable';
import { IGetToken, IToken } from '@tokenizer/token';

export class BufferTokenizer implements ITokenizer {

  public fileInfo: IFileInfo;
  public position: number = 0;

  /**
   * Construct BufferTokenizer
   * @param buffer - Buffer to tokenize
   * @param fileInfo - Pass additional file information to the tokenizer
   */
  constructor(private buffer: Buffer, fileInfo?: IFileInfo) {
    this.fileInfo = fileInfo ? fileInfo : {};
    this.fileInfo.size = this.fileInfo.size ?  this.fileInfo.size : buffer.length;
  }

  /**
   * Read buffer from tokenizer
   * @param buffer
   * @param options - Read behaviour options
   * @returns {Promise<number>}
   */
  public async readBuffer(buffer: Buffer | Uint8Array, options?: IReadChunkOptions): Promise<number> {

    if (options && options.position) {
      if (options.position < this.position) {
        throw new Error('`options.position` must be equal or greater than `tokenizer.position`');
      }
      this.position = options.position;
    }

    return this.peekBuffer(buffer, options).then(bytesRead => {
      this.position += bytesRead;
      return bytesRead;
    });
  }

  /**
   * Peek (read ahead) buffer from tokenizer
   * @param buffer
   * @param options - Read behaviour options
   * @returns {Promise<number>}
   */
  public async peekBuffer(buffer: Buffer | Uint8Array, options?: IReadChunkOptions): Promise<number> {

    let offset = 0;
    let length = buffer.length;
    let position = this.position;

    if (options) {
      if (options.position) {
        if (options.position < this.position) {
          throw new Error('`options.position` can be less than `tokenizer.position`');
        }
        position = options.position;
      }
      if (Number.isInteger(options.length)) {
        length = options.length;
      } else {
        length -= options.offset || 0;
      }
      if (options.offset) {
        offset = options.offset;
      }
    }

    if (length === 0) {
      return Promise.resolve(0);
    }

    position = position || this.position;
    if (!length) {
      length = buffer.length;
    }
    const bytes2read = Math.min(this.buffer.length - position, length);
    if ((!options || !options.mayBeLess) && bytes2read < length) {
      throw new EndOfStreamError();
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
      throw new EndOfStreamError();
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
