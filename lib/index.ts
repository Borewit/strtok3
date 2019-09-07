import * as Stream from "stream";

import {FileTokenizer} from './FileTokenizer';
import * as fs from './FsPromise';
import {ReadStreamTokenizer} from './ReadStreamTokenizer';
import * as core from './core';

/**
 * Construct ReadStreamTokenizer from given file path.
 * @param filePath
 * @returns {Promise<FileTokenizer>}
 */
export async function fromFile(filePath: string): Promise<FileTokenizer> {
  if (fs.pathExists(filePath)) {
    const stat = await fs.stat(filePath);
    const fd = await fs.open(filePath, "r");
    return new FileTokenizer(fd, stat.size);
  } else {
    throw new Error(`File not found: ${filePath}`);
  }
}

/**
 * Construct ReadStreamTokenizer from given Stream.
 * Will set fileSize, if provided given Stream has set the .path property.
 * @param stream Stream.Readable
 * @returns {Promise<ReadStreamTokenizer>}
 */
export async function fromStream(stream: Stream.Readable): Promise<ReadStreamTokenizer> {
  if ((stream as any).path) {
    const stat = await fs.stat((stream as any).path);
    return core.fromStream(stream, stat.size);
  }
  return new ReadStreamTokenizer(stream);
}

/**
 * Construct ReadStreamTokenizer from given Buffer.
 * @param buffer Buffer to tokenize
 * @returns BufferTokenizer
 */
export const fromBuffer = core.fromBuffer;
