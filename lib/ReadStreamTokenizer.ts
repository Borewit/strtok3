import { AbstractTokenizer } from './AbstractTokenizer.js';
import { EndOfStreamError, StreamReader } from 'peek-readable';
import * as Stream from 'node:stream';
import { IFileInfo, IReadChunkOptions } from './types';

const maxBufferSize = 256000;

export class ReadStreamTokenizer extends AbstractTokenizer {

  private streamReader: StreamReader;

  public constructor(stream: Stream.Readable, fileInfo?: IFileInfo) {
    super(fileInfo);
    this.streamReader = new StreamReader(stream);
  }

  /**
   * Get file information, an HTTP-client may implement this doing a HEAD request
   * @return Promise with file information
   */
  public async getFileInfo(): Promise<IFileInfo> {
    return this.fileInfo;
  }

  /**
   * Read buffer from tokenizer
   * @param buffer - Target buffer to fill with data read from the tokenizer-stream
   * @param options - Read behaviour options
   * @returns Promise with number of bytes read
   */
  public async readBuffer(buffer: Uint8Array, options?: IReadChunkOptions): Promise<number> {

    // const _offset = position ? position : this.position;
    // debug(`readBuffer ${_offset}...${_offset + length - 1}`);

    let offset = 0;
    let length = buffer.length;
    if (options) {

      if (Number.isInteger(options.length)) {
        length = options.length;
      } else {
        length -= options.offset || 0;
      }

      if (options.position) {
        const skipBytes = options.position - this.position;
        if (skipBytes > 0) {
          await this.ignore(skipBytes);
          return this.readBuffer(buffer, options);
        } else if (skipBytes < 0) {
          throw new Error('`options.position` must be equal or greater than `tokenizer.position`');
        }
      }

      if (options.offset) {
        offset = options.offset;
      }
    }

    if (length === 0) {
      return 0;
    }

    const bytesRead = await this.streamReader.read(buffer, offset, length);
    this.position += bytesRead;
    if ((!options || !options.mayBeLess) && bytesRead < length) {
      throw new EndOfStreamError();
    }
    return bytesRead;
  }

  /**
   * Peek (read ahead) buffer from tokenizer
   * @param uint8Array - Uint8Array (or Buffer) to write data to
   * @param options - Read behaviour options
   * @returns Promise with number of bytes peeked
   */
  public async peekBuffer(uint8Array: Uint8Array, options?: IReadChunkOptions): Promise<number> {

    options = this.normalizeOptions(uint8Array, options);
    let bytesRead = 0;

    if (options.position) {
      const skipBytes = options.position - this.position;
      if (skipBytes > 0) {
        const skipBuffer = new Uint8Array(options.length + skipBytes);
        bytesRead = await this.peekBuffer(skipBuffer, {mayBeLess: options.mayBeLess});
        uint8Array.set(skipBuffer.subarray(skipBytes), options.offset);
        return bytesRead - skipBytes;
      } else if (skipBytes < 0) {
        throw new Error('Cannot peek from a negative offset in a stream');
      }
    }

    if (options.length > 0) {
      try {
        bytesRead = await this.streamReader.peek(uint8Array, options.offset, options.length);
      } catch (err) {
        if (options && options.mayBeLess && err instanceof EndOfStreamError) {
          return 0;
        }
        throw err;
      }
      if ((!options.mayBeLess) && bytesRead < options.length) {
        throw new EndOfStreamError();
      }
    }

    return bytesRead;
  }

  public async ignore(length: number): Promise<number> {
    // debug(`ignore ${this.position}...${this.position + length - 1}`);
    const bufSize = Math.min(maxBufferSize, length);
    const buf = new Uint8Array(bufSize);
    let totBytesRead = 0;
    while (totBytesRead < length) {
      const remaining = length - totBytesRead;
      const bytesRead = await this.readBuffer(buf, {length: Math.min(bufSize, remaining)});
      if (bytesRead < 0) {
        return bytesRead;
      }
      totBytesRead += bytesRead;
    }
    return totBytesRead;
  }
}
