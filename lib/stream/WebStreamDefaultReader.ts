import { EndOfStreamError } from './Errors.js';
import { AbstractStreamReader } from "./AbstractStreamReader.js";

export class WebStreamDefaultReader extends AbstractStreamReader {
  private buffer: Uint8Array | null = null; // Internal buffer to store excess data

  public constructor(private reader: ReadableStreamDefaultReader<Uint8Array>) {
    super();
  }

  /**
   * Copy chunk to target, and store the remainder in this.buffer
   */
  private writeChunk(target: Uint8Array, chunk: Uint8Array): number {
    const written = Math.min(chunk.length, target.length);
    target.set(chunk.subarray(0, written));

    // Adjust the remainder of the buffer
    if (written < chunk.length) {
      this.buffer = chunk.subarray(written);
    } else {
      this.buffer = null;
    }
    return written;
  }

  /**
   * Read from stream
   * @param buffer - Target Uint8Array (or Buffer) to store data read from stream in
   * @param mayBeLess - If true, may fill the buffer partially
   * @protected Bytes read
   */
  protected async readFromStream(buffer: Uint8Array, mayBeLess: boolean): Promise<number> {

    if (buffer.length === 0) return 0;

    let totalBytesRead = 0;

    // Serve from the internal buffer first
    if (this.buffer) {
      totalBytesRead += this.writeChunk(buffer, this.buffer);
    }

    // Continue reading from the stream if more data is needed
    while (totalBytesRead < buffer.length && !this.endOfStream) {
      const result = await this.reader.read();

      if (result.done) {
        this.endOfStream = true;
        break;
      }

      if (result.value) {
        totalBytesRead += this.writeChunk(buffer.subarray(totalBytesRead), result.value);
      }
    }

    if (!mayBeLess && totalBytesRead === 0 && this.endOfStream) {
      throw new EndOfStreamError();
    }

    return totalBytesRead;
  }

  public abort(): Promise<void> {
    this.interrupted = true;
    return this.reader.cancel();
  }

  public async close(): Promise<void> {
    await this.abort();
    this.reader.releaseLock();
  }
}
