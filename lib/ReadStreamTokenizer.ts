import { AbstractTokenizer } from './AbstractTokenizer';
import { EndOfStreamError, StreamReader } from 'then-read-stream';
import * as Stream from 'stream';

import * as _debug from 'debug';

const debug = _debug('strtok3:ReadStreamTokenizer');

const maxBufferSize = 1 * 1000 * 1000;

export class ReadStreamTokenizer extends AbstractTokenizer {

  private streamReader: StreamReader;

  public constructor(stream: Stream.Readable, fileSize?: number) {
    super();
    this.streamReader = new StreamReader(stream);
    this.fileSize = fileSize;
  }

  /**
   * Read buffer from tokenizer
   * @param buffer - Target buffer to fill with data read from the tokenizer-stream
   * @param offset - Offset in the buffer to start writing at; if not provided, start at 0
   * @param length - The number of bytes to read
   * @param position - Offset where to begin reading within the file. If position is null, data will be read from the current file position.
   * @param maybeless - If set, will not throw an EOF error if not all of the requested data could be read
   * @returns Promise with number of bytes read
   */
  public async readBuffer(buffer: Buffer | Uint8Array, offset: number = 0, length: number = buffer.length, position?: number, maybeless?: boolean): Promise<number> {

    // const _offset = position ? position : this.position;
    // debug(`readBuffer ${_offset}...${_offset + length - 1}`);

    if (length === 0) {
      return 0;
    }

    if (position) {
      const skipBytes = position - this.position;
      if (skipBytes > 0) {
        await this.ignore(position - this.position);
        return this.readBuffer(buffer, offset, length);
      } else if (skipBytes < 0) {
        throw new Error('Cannot read from a negative offset in a stream');
      }
    }

    const bytesRead = await this.streamReader.read(buffer, offset, length);
    this.position += bytesRead;
    if (!maybeless && bytesRead < length) {
      throw new EndOfStreamError();
    }
    return bytesRead;
  }

  /**
   * Peek (read ahead) buffer from tokenizer
   * @param buffer - Target buffer to write the data read to
   * @param offset - The offset in the buffer to start writing at; if not provided, start at 0
   * @param length - The number of bytes to read
   * @param position - Specifying where to begin reading from in the file. If position is null, data will be read from the current file position.
   * @param maybeless - If set, will not throw an EOF error if the less then the requested length could be read
   * @returns Promise with number of bytes peeked
   */
  public async peekBuffer(buffer: Buffer | Uint8Array, offset: number = 0, length: number = buffer.length, position?: number, maybeless?: boolean): Promise<number> {

    // const _offset = position ? position : this.position;
    // debug(`peek ${_offset}...${_offset + length - 1}`);

    let bytesRead: number;
    if (position) {
      const skipBytes = position - this.position;
      if (skipBytes > 0) {
        const skipBuffer = Buffer.alloc(length + skipBytes);
        bytesRead = await this.peekBuffer(skipBuffer, 0, skipBytes + length, undefined, maybeless);
        skipBuffer.copy(buffer, offset, skipBytes);
        return bytesRead - skipBytes;
      } else if (skipBytes < 0) {
        throw new Error('Cannot peek from a negative offset in a stream');
      }
    }

    bytesRead = await this.streamReader.peek(buffer, offset, length);
    if (!maybeless && bytesRead < length) {
      throw new EndOfStreamError();
    }
    return bytesRead;
  }

  public async ignore(length: number): Promise<number> {
    debug(`ignore ${this.position}...${this.position + length - 1}`);
    const bufSize = Math.min(maxBufferSize, length);
    const buf = Buffer.alloc(bufSize);
    let totBytesRead = 0;
    while (totBytesRead < length) {
      const remaining = length - totBytesRead;
      const bytesRead = await this.readBuffer(buf, 0, Math.min(bufSize, remaining));
      if (bytesRead < 0) {
        return bytesRead;
      }
      totBytesRead += bytesRead;
    }
    return totBytesRead;
  }
}
