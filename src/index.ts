const assert = require('assert');

import * as stream from "stream";
import {StreamReader} from "then-read-stream";
import * as fs from 'fs-extra';

import {IGetToken, IFlush, IToken} from 'token-types';

/**
 * Used to reject read if end-of-stream has been reached
 * @type {Error}
 */
const EndOfFile = new Error("End-Of-File");

export interface ITokenizer {

  /**
   * File length in bytes
   */
  fileSize?: number;

  readBuffer(buffer: Buffer, offset: number, length: number, position?: number): Promise<number>;

  readToken<T>(token: IGetToken<T>, position?: number | null): Promise<T>;

  readNumber(token: IGetToken<number>): Promise<number>;

  /**
   * Ignore given number of bytes
   * @param length Lenght in bytes
   */
  ignore(length: number);
}

// Possibly call flush()
const maybeFlush = function (b: Buffer, o, len: number, flush: IFlush) {
  if (o + len > b.length) {
    if (typeof(flush) !== 'function') {
      throw new Error(
        'Buffer out of space and no valid flush() function found'
      );
    }

    flush(b, o);

    return 0;
  }

  return o;
};

export class IgnoreType implements IGetToken<Buffer> {

  /**
   * @param len Number of bytes to ignore (skip)
   */
  public constructor(public len: number) {
  }

  // ToDo: don't read,, but skip data
  public get(buf: Buffer, off: number): Buffer {
    return buf.slice(off, off + this.len);
  }
}

export abstract class AbstractTokenizer implements ITokenizer {

  public fileSize?: number;

  private numBuffer = new Buffer(4);

  public abstract readBuffer(buffer: Buffer, offset: number, length: number, position: number): Promise<number>;

  private _readToken<T>(buffer: Buffer, token: IToken<T>): Promise<T> {
    return this.readBuffer(buffer, 0, token.len, null).then((res) => {
      return token.get(buffer, 0);
    });
  }

  public readToken<T>(token: IGetToken<T>, position: number | null = null): Promise<T> {
    const buffer = new Buffer(token.len);
    return this.readBuffer(buffer, 0, token.len, position).then((res) => {
      return token.get(buffer, 0);
    });
  }

  public readNumber(token: IToken<number>): Promise<number> {
    return this._readToken(this.numBuffer, token);
  }

  public abstract ignore(length: number): Promise<void>;
}

export class ReadStreamTokenizer extends AbstractTokenizer {

  private streamReader: StreamReader;

  public constructor(stream: stream.Readable, fileSize?: number) {
    super();
    this.streamReader = new StreamReader(stream);
    this.fileSize =  fileSize;
  }

  public readBuffer(buffer: Buffer, offset: number, length: number, position: number = null): Promise<number> {
    return this.streamReader.read(buffer, offset, length, position); // ToDo: looks like wrong return type is defined in fs.read
  }

  /**
   * Construct ReadStreamTokenizer from given stream.
   * Will set fileSize, if provided given stream has set the .path property/
   * @param stream stream.Readable
   * @returns {any}
   */
  public static read(stream: stream.Readable): Promise<ReadStreamTokenizer> {
    if((stream as any).path) {
      return fs.stat((stream as any).path).then((stat) => {
        return new ReadStreamTokenizer(stream, stat.size);
      })
    }
    return Promise.resolve(new ReadStreamTokenizer(stream));
  }

  public ignore(length: number): Promise<void> {
    const buf = new Buffer(length);
    return this.streamReader.read(buf, 0, length).then(() => null); // stream cannot skip data
  }
}

export class FileTokenizer extends AbstractTokenizer {

  private fileOffset: number = 0;
  private ignoreLength: number = 0;

  constructor(private fd: number, public fileSize?: number) {
    super();
  }

  public readBuffer(buffer: Buffer, offset: number, length: number, position: number = null): Promise<number> {
    if(position) {
      this.fileOffset = position;
      this.ignoreLength = 0;
    } else if(this.ignoreLength>0) {
      position = this.fileOffset + this.ignoreLength;
      this.ignoreLength = 0;
    }
    return (fs.read(this.fd, buffer, offset, length, position) as any).then((bytesRead) => { // ToDo: looks like wrong return type is defined in fs.read
      if(bytesRead<length)
        throw EndOfFile;
      this.fileOffset += bytesRead;
      return bytesRead;
    });
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

  public ignore(length: number): Promise<void> {
    this.ignoreLength += length;
    return Promise.resolve<void>(null);
  }

  public close(): Promise<void> {
    return fs.close(this.fd);
  }

}


