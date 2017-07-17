import {AbstractTokenizer} from "./AbstractTokenizer";
import * as fs from 'fs-extra';
import {EndOfFile} from "./";

export class FileTokenizer extends AbstractTokenizer {

  private fileOffset: number = 0;

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
  public readBuffer(buffer: Buffer, offset?: number, length?: number, position?: number): Promise<number> {

    if (position) {
      this.fileOffset = position;
    }

    if (!length) {
      length = buffer.length;
    }

    return (fs.read(this.fd, buffer, offset, length, this.fileOffset) as any).then((res) => {
      if (res.bytesRead < length)
        throw EndOfFile;
      this.fileOffset += res.bytesRead;

      // debug("Read:" + buffer.slice(offset, length).toString("hex"));

      return res.bytesRead;
    });
  }

  /**
   * @param length Number of bytes to ignore
   */
  public ignore(length: number): Promise<void> {
    this.fileOffset += length;
    return Promise.resolve<void>(null);
  }

  public close(): Promise<void> {
    return fs.close(this.fd);
  }
}
