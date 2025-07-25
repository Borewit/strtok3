import { createReadStream } from  'node:fs';
import { Transform, Readable } from 'node:stream';
import { makeByteReadableStreamFromNodeReadable } from 'node-readable-to-web-readable-stream';

export function makeByteReadableStreamFromFile(filename: string, delay = 0): ReadableStream<Uint8Array> {

  // Create a Node.js Readable stream
  const nodeReadable = createReadStream(filename);

  // Create a Transform stream to introduce delay
  const delayTransform = new Transform({
    transform(chunk, _encoding, callback) {
      setTimeout(() => callback(null, chunk), delay);
    }
  });

  // Pipe through the delay transform
  const delayedNodeStream = nodeReadable.pipe(delayTransform);

  return makeByteReadableStreamFromNodeReadable(delayedNodeStream);
}

export class DelayedStream extends Readable {

  private buffer: (Uint8Array | null)[];
  private isReading: boolean;
  private path: string | undefined;

  constructor(private sourceStream: Readable, private delay = 0) {
    super();
    this.path = (sourceStream as unknown as {path: string}).path;
    this.buffer = [];
    this.isReading = false;

    this.sourceStream.on('data', (chunk) => {
      this.buffer.push(chunk);
      this.emitDelayed();
    });

    this.sourceStream.on('end', () => {
      this.buffer.push(null); // Signal the end of the stream
      this.emitDelayed();
    });
  }

  _read() {
    if (!this.isReading && this.buffer.length > 0) {
      this.emitDelayed();
    }
  }

  emitDelayed() {
    if (this.isReading) return;

    if (this.buffer.length > 0) {
      this.isReading = true;
      const chunk = this.buffer.shift();

      setTimeout(() => {
        this.push(chunk);
        this.isReading = false;

        if (this.buffer.length > 0) {
          this.emitDelayed();
        }
      }, this.delay);
    }
  }
}

/**
 * A mock Node.js readable-stream, using string to read from
 */
export class SourceStream extends Readable {

  private readonly buf: Uint8Array;

  constructor(str = '', private delay = 0) {
    super();

    this.buf = new TextEncoder().encode(str);
  }

  public _read() {
    setTimeout(() => {
      this.push(this.buf);
      this.push(null); // Signal end of stream
    }, this.delay);
  }
}

// Function to convert a string to a BYOB ReadableStream
function stringReadableStream(inputString: string, delay = 0): ReadableStream<Uint8Array> {
  // Convert the string to a Uint8Array using TextEncoder

  const nodeReadable = new SourceStream(inputString, delay);
  return makeByteReadableStreamFromNodeReadable(nodeReadable) as ReadableStream<Uint8Array>;
}

export function stringToReadableStream(inputString: string, forceDefault: boolean, delay?: number): ReadableStream<Uint8Array> {
  const stream = stringReadableStream(inputString, delay);
  const _getReader = stream.getReader.bind(stream);

  // @ts-ignore
  stream.getReader = (options?: { mode?: string }) => {
    if (forceDefault) {
      // Force returning the default reader
      return _getReader(); // Call without options for a default reader
    }
    // @ts-ignore
    return _getReader(options); // Pass through other options
  };

  return stream;
}
