import {IGetToken} from 'token-types';

/**
 * Used to reject read if end-of-Stream or end-of-file is reached
 * @type {Error}
 */
export const endOfFile = "End-Of-File";

export interface ITokenizer {

  /**
   * File length in bytes
   */
  fileSize?: number;

  /**
   * Offset in bytes (= number of bytes read) since beginning of file or stream
   */
  position: number;

  /**
   * Peek (read ahead) buffer from tokenizer
   * @param buffer
   * @param offset is the offset in the buffer to start writing at; if not provided, start at 0
   * @param length is an integer specifying the number of bytes to read
   * @param position is an integer specifying where to begin reading from in the file. If position is null, data will be read from the current file position.
   * @param maybeLess If true, will return the bytes available if available bytes is less then length.
   * @returns {Promise<TResult|number>}
   */
  peekBuffer(buffer: Buffer, offset?: number, length?: number, position?: number, maybeLess?: boolean): Promise<number>;

  /**
   * Read buffer from tokenizer
   * @param buffer
   * @param offset is the offset in the buffer to start writing at; if not provided, start at 0
   * @param length is an integer specifying the number of bytes to read
   * @param position is an integer specifying where to begin reading from in the file. If position is null, data will be read from the current file position.
   * @returns {Promise<TResult|number>}
   */
  readBuffer(buffer: Buffer, offset?: number, length?: number, position?: number): Promise<number>;

  peekToken<T>(token: IGetToken<T>, position?: number | null): Promise<T>;

  readToken<T>(token: IGetToken<T>, position?: number | null): Promise<T>;

  peekNumber(token: IGetToken<number>): Promise<number>;

  readNumber(token: IGetToken<number>): Promise<number>;

  /**
   * Ignore given number of bytes
   * @param actual number of bytes ignored
   */
  ignore(length: number);
}
