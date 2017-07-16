import {AbstractTokenizer} from "./AbstractTokenizer";
import * as fs from 'fs-extra';
import {EndOfFile} from "./";

export class FileTokenizer extends AbstractTokenizer {

  private fileOffset: number = 0;

  constructor(private fd: number, public fileSize?: number) {
    super();
  }

  public readBuffer(buffer: Buffer, offset: number, length: number, position?: number): Promise<number> {

    if (position) {
      this.fileOffset = position;
    }

    return (fs.read(this.fd, buffer, offset, length, this.fileOffset) as any).then((bytesRead) => { // ToDo: looks like wrong return type is defined in fs.read
      if (bytesRead < length)
        throw EndOfFile;
      this.fileOffset += bytesRead;

      // debug("Read:" + buffer.slice(offset, length).toString("hex"));

      return bytesRead;
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
