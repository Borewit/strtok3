import * as fs from 'node:fs/promises';
import { ReadableStream } from 'node:stream/web';
import { Readable } from 'node:stream';

export async function makeReadableByteFileStream(filename: string, delay = 0): Promise<{ stream: ReadableStream<Uint8Array>, closeFile: () => Promise<void> }> {

  let position = 0;
  const fileHandle = await fs.open(filename, 'r');

  return {
    stream: new ReadableStream({
      type: 'bytes',

      async pull(controller) {

        // @ts-ignore
        const view = controller.byobRequest.view;

        setTimeout(async () => {
          try {
            const {bytesRead} = await fileHandle.read(view, 0, view.byteLength, position);
            if (bytesRead === 0) {
              await fileHandle.close();
              controller.close();
              // @ts-ignore
              controller.byobRequest.respond(0);
            } else {
              position += bytesRead;
              // @ts-ignore
              controller.byobRequest.respond(bytesRead);
            }
          } catch (err) {
            controller.error(err);
            await fileHandle.close();
          }
        }, delay);
      },

      async cancel() {
        await fileHandle.close();
      },

      autoAllocateChunkSize: 1024
    }),
    closeFile: () => {
      return fileHandle.close();
    }
  };
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

