export type IFlush = (b: Buffer, o: number) => void;

export interface IGetToken<T> {

  /**
   * Length in bytes of encoded value
   */
  len: number;

  /**
   * Decode value from buffer at offset
   * @param buf - Buffer to read the decoded value from
   * @param off - Decode offset
   */
  get(buf: Buffer, off: number): T;
}

export interface IToken<T> extends IGetToken<T> {
  /**
   * Encode value to buffer
   * @param buffer - Buffer to write the encoded value to
   * @param offset - Buffer write offset
   * @param value - Value to decode of type T
   * @param flush - ToDo
   */
  put(buffer: Buffer, offset: number, value: T, flush?: IFlush): number
}

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
   * @param buffer - Target buffer to fill with data peek from the tokenizer-stream
   * @param offset - The offset in the buffer to start writing at; if not provided, start at 0
   * @param length - is an integer specifying the number of bytes to read
   * @param position is an integer specifying where to begin reading from in the file. If position is null, data will be read from the current file position.
   * @param maybeless - If set, will not throw an EOF error if not all of the requested data could be read
   * @returns Promise with number of bytes read
   */
  peekBuffer(buffer: Buffer, offset?: number, length?: number, position?: number, maybeless?: boolean): Promise<number>;

  /**
   * Peek (read ahead) buffer from tokenizer
   * @param buffer - Target buffer to fill with data peeked from the tokenizer-stream
   * @param offset - Offset in the buffer to start writing at; if not provided, start at 0
   * @param length - The number of bytes to read
   * @param position - Offset where to begin reading within the file. If position is null, data will be read from the current file position.
   * @param maybeless - If set, will not throw an EOF error if not all of the requested data could be read
   * @returns Promise with number of bytes read
   */
  readBuffer(buffer: Buffer, offset?: number, length?: number, position?: number, maybeless?: boolean): Promise<number>;

  /**
   * Peek a token from the tokenizer-stream.
   * @param token - Token to peek from the tokenizer-stream.
   * @param position - Offset where to begin reading within the file. If position is null, data will be read from the current file position.
   * @param maybeless - If set, will not throw an EOF error if the less then the requested length could be read.
   */
  peekToken<T>(token: IGetToken<T>, position?: number | null, maybeless?: boolean): Promise<T>;

  /**
   * Read a token from the tokenizer-stream.
   * @param token - Token to peek from the tokenizer-stream.
   * @param position - Offset where to begin reading within the file. If position is null, data will be read from the current file position.
   * @param maybeless - If set, will not throw an EOF error if the less then the requested length could be read.
   */
  readToken<T>(token: IGetToken<T>, position?: number | null, maybeless?: boolean): Promise<T>;

  /**
   * Peek a numeric token from the stream
   * @param token - Numeric token
   * @returns Promise with number
   */
  peekNumber(token: IGetToken<number>): Promise<number>;

  /**
   * Read a numeric token from the stream
   * @param token - Numeric token
   * @returns Promise with number
   */
  readNumber(token: IGetToken<number>): Promise<number>;

  /**
   * Ignore given number of bytes
   * @param actual number of bytes ignored
   */
  ignore(length: number);

  /**
   * Clean up resources.
   * It does not close the stream for StreamReader, but is does close the file-descriptor.
   */
  close(): Promise<void>;
}
