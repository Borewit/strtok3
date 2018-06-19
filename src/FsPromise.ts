import * as fs from "fs";
import {Promise} from "bluebird";

/**
 * Convert fs functions to promise based functions
 */
export class FsPromise {

  public close = Promise.promisify(fs.close);

  public stat = Promise.promisify(fs.stat);

  public open = Promise.promisify(fs.open);

  public pathExists = fs.existsSync;

  public read(fd: number, buffer: Buffer, offset: number, length: number, position: number): Promise<{bytesRead: number}> {
    return new Promise<{bytesRead: number}>((resolve, reject) => {
      fs.read(fd, buffer, offset, length, position, (err, bytesRead, _buffer) => {
        if (err)
          reject(err);
        else
          resolve({bytesRead, _buffer});
      });
    });
  }
}
