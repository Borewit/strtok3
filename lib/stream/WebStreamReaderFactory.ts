import type { ReadableStream as NodeReadableStream } from 'node:stream/web';
import { WebStreamByobReader } from './WebStreamByobReader.js';
import { WebStreamDefaultReader } from './WebStreamDefaultReader.js';

export type AnyWebByteStream = NodeReadableStream<Uint8Array> | ReadableStream<Uint8Array>;

export function makeWebStreamReader(stream: AnyWebByteStream): WebStreamByobReader | WebStreamDefaultReader {
  try {
    const reader = stream.getReader({mode: "byob"});
    if (reader instanceof ReadableStreamDefaultReader) {
      // Fallback to default reader in case `mode: byob` is ignored
      return new WebStreamDefaultReader(reader as ReadableStreamDefaultReader<Uint8Array>);
    }
    return new WebStreamByobReader(reader);
  } catch(error) {
    if (error instanceof TypeError) {
      // Fallback to default reader in case `mode: byob` rejected by a `TypeError`
      return new WebStreamDefaultReader(stream.getReader());
    }
    throw error;
  }
}
