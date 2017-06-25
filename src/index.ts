///<reference path="../node_modules/@types/fs-extra/index.d.ts"/>

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

  readBuffer(buffer: Buffer, offset: number, length: number, position?: number): Promise<number>;

  readToken<T>(token: IGetToken<T>, position?: number | null): Promise<T>;

  readNumber(token: IGetToken<number>): Promise<number>;
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

  constructor(public len: number) {
  }

  // ToDo: don't read,, but skip data
  public get(buf: Buffer, off: number): Buffer {
    return buf.slice(off, off + this.len);
  }
}

export abstract class AbstractTokenizer implements ITokenizer {

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
}

export class ReadStreamTokenizer extends AbstractTokenizer {

  private streamReader: StreamReader;

  public constructor(stream: stream.Readable) {
    super();
    this.streamReader = new StreamReader(stream);
  }

  public readBuffer(buffer: Buffer, offset: number, length: number, position: number = null): Promise<number> {
    return this.streamReader.read(buffer, offset, length, position);
  }

  public static read(stream: stream.Readable): ReadStreamTokenizer {
    return new ReadStreamTokenizer(stream);
  }
}

export class FileTokenizer extends AbstractTokenizer {

  constructor(private fd: number, public fileSize?: number) {
    super();
  }

  public readBuffer(buffer: Buffer, offset: number, length: number, position: number = null): Promise<number> {
    return (fs.read(this.fd, buffer, offset, length, position) as any) .then((actualLength: number) => { // ToDo: looks like wrong return type is defined in fs.read
      if(actualLength<length)
        throw EndOfFile;
      return actualLength;
    }); // ToDo: looks like wrong return type is defined in fs.read
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


