import {AbstractTokenizer} from "./AbstractTokenizer";
import {endOfFile} from "./";
import {FsPromise} from "./FsPromise";

export class FileTokenizer extends AbstractTokenizer {

  private fs = new FsPromise();

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

    return this.fs.read(this.fd, buffer, offset, length, this.position).then(res => {
      if (res.bytesRead < length)
        throw new Error(endOfFile);
      this.position += res.bytesRead;
      if (res.bytesRead < length) {
        throw new Error(endOfFile);
      }
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
  public peekBuffer(buffer: Buffer, offset: number = 0, length: number = buffer.length, position: number = this.position, maybeLess: boolean = false): Promise<number> {

    return this.fs.read(this.fd, buffer, offset, length, position).then(res => {
      if (!maybeLess && res.bytesRead < length) {
        throw new Error(endOfFile);
      }
      return res.bytesRead;
    });
  }

  /**
   * @param length Number of bytes to ignore
   * @return resolves the number of bytes ignored, equals length if this available, otherwise the number of bytes available
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
    return this.fs.close(this.fd);
  }
}
