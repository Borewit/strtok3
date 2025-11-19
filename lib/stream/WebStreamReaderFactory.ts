import type { ReadableStream as NodeReadableStream } from 'node:stream/web';
import { WebStreamByobReader } from './WebStreamByobReader.js';
import { WebStreamDefaultReader } from './WebStreamDefaultReader.js';
import type { OnClose } from "../types.js";

export type AnyWebByteStream = NodeReadableStream<Uint8Array> | ReadableStream<Uint8Array>;

function isByobReader(
  reader: ReadableStreamDefaultReader<Uint8Array> | ReadableStreamBYOBReader
): reader is ReadableStreamBYOBReader {
  return typeof reader.read === "function" && reader.read.length === 1;
}

export function makeWebStreamReader(stream: AnyWebByteStream, options?: { onClose?: OnClose }): WebStreamByobReader | WebStreamDefaultReader {
  try {
    const reader = stream.getReader({mode: "byob"});

    if(isByobReader(reader as ReadableStreamBYOBReader)) {
      return new WebStreamByobReader(reader as ReadableStreamBYOBReader, options);
    }

    return new WebStreamDefaultReader(reader as ReadableStreamDefaultReader<Uint8Array>, options);
  } catch(error) {
    if (error instanceof TypeError) {
      // Fallback to default reader in case `mode: byob` rejected by a `TypeError`
      const reader = stream.getReader();
      return new WebStreamDefaultReader(reader as ReadableStreamDefaultReader<Uint8Array>, options);
    }
    throw error;
  }
}
