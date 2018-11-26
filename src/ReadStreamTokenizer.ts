import { AbstractTokenizer } from './AbstractTokenizer';
import { endOfFile } from './type';
import { endOfStream, StreamReader } from 'then-read-stream';
import * as Stream from 'stream';

import * as _debug from 'debug';

const debug = _debug('strtok3:ReadStreamTokenizer');

export class ReadStreamTokenizer extends AbstractTokenizer {

  private streamReader: StreamReader;

  public constructor(stream: Stream.Readable, fileSize?: number) {
    super();
    this.streamReader = new StreamReader(stream);
    this.fileSize = fileSize;
  }

  /**
   * Read buffer from stream
   * @param buffer
   * @param offset is the offset in the buffer to start writing at; if not provided, start at 0
   * @param length is an integer specifying the number of bytes to read
   * @returns Promise number of bytes read
   */
  public async readBuffer(buffer: Buffer | Uint8Array, offset: number = 0, length: number = buffer.length, position?: number): Promise<number> {

    if (length === 0) {
      return Promise.resolve(0);
    }

    if (position) {
      if (position > this.position) {
        await this.ignore(position - this.position);
        return this.readBuffer(buffer, offset, length);
      } else {
        throw new Error('Cannot read from a negative offset in a stream');
      }
    }

    let bytesRead;
    try {
      bytesRead = await this.streamReader.read(buffer, offset, length);
      this.position += bytesRead;
    } catch (err) {
      if (err.message === endOfStream) // Convert EndOfStream into EndOfFile
        throw new Error(endOfFile);
      else throw err;
    }
    if (bytesRead < length) {
      throw new Error(endOfFile);
    }
    return bytesRead;
  }

  /**
   * Peek (read ahead) buffer from tokenizer
   * @param buffer
   * @param offset is the offset in the buffer to start writing at; if not provided, start at 0
   * @param length is an integer specifying the number of bytes to read
   * @param position is an integer specifying where to begin reading from in the file. If position is null, data will be read from the current file position.
   * @returns {Promise<TResult|number>}
   */
  public async peekBuffer(buffer: Buffer | Uint8Array, offset: number = 0, length: number = buffer.length, position?: number, maybeLess?: boolean): Promise<number> {

    let bytesRead;
    try {
      bytesRead = await this.streamReader.peek(buffer, offset, length);
    } catch (err) {
      if (err.message === endOfStream) // Convert EndOfStream into EndOfFile
        throw new Error(endOfFile);
      else throw err;
    }
    if (!maybeLess && bytesRead < length) {
      throw new Error(endOfFile);
    }
    return bytesRead;
  }

  public async ignore(length: number): Promise<number> {
    debug(`Ignore ${length} bytes in a stream`);
    const buf = Buffer.alloc(length);
    return this.readBuffer(buf); // Stream cannot skip data
  }
}
