import {AbstractTokenizer} from "./AbstractTokenizer";
import * as fs from "fs";
import {endOfFile} from "./";
import {Promise} from "bluebird";

export class FileTokenizer extends AbstractTokenizer {

  private _read = Promise.promisify(fs.read);
  private _close = Promise.promisify(fs.readFile);

  constructor(private fd: number, public fileSize?: number) {
    super();
  }

  /**
   * Read buffer from file
   * @param buffer
   * @param offset is the offset in the buffer to start writing at; if not provided, start at 0
   * @param length is an integer specifying the number of bytes to read, of not provided the buffer length will be used
   * @param position is an integer specifying where to begin reading from in the file. If position is null, data will be read from the current file position.
   * @returns Promise number of bytes read
   */
  public readBuffer(buffer: Buffer, offset: number = 0, length: number = buffer.length, position?: number): Promise<number> {

    if (position) {
      this.position = position;
    }

    if (length === 0) {
      return Promise.resolve(0);
    }

    if (!length) {
      length = buffer.length;
    }

    return (this._read(this.fd, buffer, offset, length, this.position) as any).then(res => {
      if (res.bytesRead < length)
        throw new Error(endOfFile);
      this.position += res.bytesRead;

      return res.bytesRead;
    });
  }

  /**
   * Peek buffer from file
   * @param buffer
   * @param offset is the offset in the buffer to start writing at; if not provided, start at 0
   * @param length is an int
   * eger specifying the number of bytes to read, of not provided the buffer length will be used
   * @param position is an integer specifying where to begin reading from in the file. If position is null, data will be read from the current file position.
   * @returns Promise number of bytes read
   */
  public peekBuffer(buffer: Buffer, offset: number = 0, length: number = buffer.length, position: number = this.position): Promise<number> {

    return (this.read(this.fd, buffer, offset, length, position) as any).then(res => {
      return res.bytesRead;
    });
  }

  /**
   * @param length Number of bytes to ignore
   */
  public ignore(length: number): Promise<number> {
    const bytesLeft = this.fileSize - this.position;
    if (length <= bytesLeft) {
      this.position += length;
      return Promise.resolve(length);
    } else {
      this.position += bytesLeft;
      return Promise.resolve(bytesLeft);
    }
  }

  public close(): Promise<void> {
    return this._close(this.fd) as any;
  }
}
