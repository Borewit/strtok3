import * as Stream from "stream";

import {FileTokenizer} from './FileTokenizer';
import {FsPromise} from './FsPromise';
import {ReadStreamTokenizer} from './ReadStreamTokenizer';
import {BufferTokenizer} from './BufferTokenizer';
import * as core from './core';

/**
 * Construct ReadStreamTokenizer from given file path.
 * @param filePath
 * @returns {Promise<FileTokenizer>}
 */
export function fromFile(filePath: string): Promise<FileTokenizer> {
  const fs = new FsPromise();

  if (fs.pathExists(filePath)) {
    return fs.stat(filePath).then(stat => {
      return fs.open(filePath, "r").then(fd => {
        return new FileTokenizer(fd, stat.size);
      });
    });
  } else {
    return Promise.reject(new Error("File not found: " + filePath));
  }
}

/**
 * Construct ReadStreamTokenizer from given Stream.
 * Will set fileSize, if provided given Stream has set the .path property.
 * @param stream Stream.Readable
 * @returns {Promise<ReadStreamTokenizer>}
 */
export function fromStream(stream: Stream.Readable): Promise<ReadStreamTokenizer> {
  if ((stream as any).path) {
    return new FsPromise().stat((stream as any).path).then(stat => {
      return core.fromStream(stream, stat.size);
    });
  }
  return Promise.resolve(new ReadStreamTokenizer(stream));
}

/**
 * Construct ReadStreamTokenizer from given Buffer.
 * @param buffer Buffer to tokenize
 * @returns BufferTokenizer
 */
export const fromBuffer = core.fromBuffer;
