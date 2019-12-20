import { AbstractTokenizer } from './AbstractTokenizer';
import { endOfFile } from './type';
import * as fs from './FsPromise';

export class FileTokenizer extends AbstractTokenizer {

  public constructor(private fd: number, public sourceFilePath: string, public fileSize?: number) {
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
  public async readBuffer(buffer: Buffer, offset: number = 0, length: number = buffer.length, position?: number): Promise<number> {

    if (position) {
      this.position = position;
    }

    if (length === 0) {
      return Promise.resolve(0);
    }

    if (!length) {
      length = buffer.length;
    }

    const res = await fs.read(this.fd, buffer, offset, length, this.position);
    if (res.bytesRead < length)
      throw new Error(endOfFile);
    this.position += res.bytesRead;
    if (res.bytesRead < length) {
      throw new Error(endOfFile);
    }
    return res.bytesRead;
  }

  /**
   * Peek buffer from file
   * @param buffer
   * @param offset is the offset in the buffer to start writing at; if not provided, start at 0
   * @param length is an integer specifying the number of bytes to read, of not provided the buffer length will be used
   * @param position is an integer specifying where to begin reading from in the file. If position is null, data will be read from the current file position.
   * @param maybeless If set, will not throw an EOF error if the less then the requested length could be read
   * @returns Promise number of bytes read
   */
  public async peekBuffer(buffer: Buffer, offset: number = 0, length: number = buffer.length, position: number = this.position, maybeless: boolean = false): Promise<number> {

    const res = await fs.read(this.fd, buffer, offset, length, position);
    if (!maybeless && res.bytesRead < length) {
      throw new Error(endOfFile);
    }
    return res.bytesRead;
  }

  /**
   * @param length Number of bytes to ignore
   * @return resolves the number of bytes ignored, equals length if this available, otherwise the number of bytes available
   */
  public async ignore(length: number): Promise<number> {
    const bytesLeft = this.fileSize - this.position;
    if (length <= bytesLeft) {
      this.position += length;
      return length;
    } else {
      this.position += bytesLeft;
      return bytesLeft;
    }
  }

  public async close(): Promise<void> {
    return fs.close(this.fd);
  }
}

export async function fromFile(sourceFilePath: string): Promise<FileTokenizer> {
  const stat = await fs.stat(sourceFilePath);
  if (!stat.isFile) {
    throw new Error(`File not a file: ${sourceFilePath}`);
  }
  const fd = await fs.open(sourceFilePath, 'r');
  return new FileTokenizer(fd, sourceFilePath, stat.size);
}
