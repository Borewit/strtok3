import {IGetToken} from 'token-types';
import {ReadStreamTokenizer} from "./ReadStreamTokenizer";
import {FileTokenizer} from "./FileTokenizer";
import * as fs from "fs-extra";
import * as Stream from "stream";

/**
 * Used to reject read if end-of-Stream or end-of-file is reached
 * @type {Error}
 */
export const EndOfFile = new Error("End-Of-File");

export interface ITokenizer {

  /**
   * File length in bytes
   */
  fileSize?: number;

  /**
   * Peek (read ahead) buffer from tokenizer
   * @param buffer
   * @param offset is the offset in the buffer to start writing at; if not provided, start at 0
   * @param length is an integer specifying the number of bytes to read
   * @param position is an integer specifying where to begin reading from in the file. If position is null, data will be read from the current file position.
   * @returns {Promise<TResult|number>}
   */
  peekBuffer(buffer: Buffer, offset: number, length: number, position?: number): Promise<number>;

  /**
   * Read buffer from tokenizer
   * @param buffer
   * @param offset is the offset in the buffer to start writing at; if not provided, start at 0
   * @param length is an integer specifying the number of bytes to read
   * @param position is an integer specifying where to begin reading from in the file. If position is null, data will be read from the current file position.
   * @returns {Promise<TResult|number>}
   */
  readBuffer(buffer: Buffer, offset: number, length: number, position?: number): Promise<number>;

  peekToken<T>(token: IGetToken<T>, position?: number | null): Promise<T>;

  readToken<T>(token: IGetToken<T>, position?: number | null): Promise<T>;

  peekNumber(token: IGetToken<number>): Promise<number>;

  readNumber(token: IGetToken<number>): Promise<number>;

  /**
   * Ignore given number of bytes
   * @param length Lenght in bytes
   */
  ignore(length: number);
}

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

/**
 * Construct ReadStreamTokenizer from given Stream.
 * Will set fileSize, if provided given Stream has set the .path property/
 * @param stream Stream.Readable
 * @returns {Promise<ReadStreamTokenizer>}
 */
export function fromStream(stream: Stream.Readable): Promise<ReadStreamTokenizer> {
  if ((stream as any).path) {
    return fs.stat((stream as any).path).then((stat) => {
      return new ReadStreamTokenizer(stream, stat.size);
    });
  }
  return Promise.resolve(new ReadStreamTokenizer(stream));
}

/**
 * Construct ReadStreamTokenizer from given file path.
 * @param filePath
 * @returns {Promise<FileTokenizer>}
 */
export function fromFile(filePath: string): Promise<FileTokenizer> {
  return fs.pathExists(filePath).then((exist) => {
    if (!exist) {
      throw new Error("File not found: " + filePath);
    }
    return fs.stat(filePath).then((stat) => {
      return fs.open(filePath, "r").then((fd) => {
        return new FileTokenizer(fd, stat.size);
      });
    });
  });
}
