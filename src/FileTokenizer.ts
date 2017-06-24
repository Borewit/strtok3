import * as fs from 'fs-extra';
import {AbstractTokenizer} from "./AbstractTokenizer";

export class FileTokenizer extends AbstractTokenizer {

  constructor(private fd: number, public fileSize?: number) {
    super();
  }

  public readBuffer(buffer: Buffer, offset: number, length: number, position: number = null): Promise<number> {
    return fs.read(this.fd, buffer, offset, length, position); // ToDo: looks like wrong return type is defined in fs.read
  }

  public static open(filePath: string): Promise<FileTokenizer> {
    return fs.pathExists(filePath).then((exist) => {
      if (!exist) {
        throw new Error("File not found: " + filePath);
      }
      return fs.stat(filePath).then((stat) => {
        return fs.open(filePath, "r").then((fd) => {
          return new FileTokenizer(fd, stat.size);
        })
      })
    });
  }

  public close(): Promise<void> {
    return fs.close(this.fd);
  }

}