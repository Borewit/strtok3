import type { Readable } from 'node:stream';
import { AbortError, } from './Errors.js';
import { Deferred } from './Deferred.js';
import { AbstractStreamReader } from "./AbstractStreamReader.js";
import type { OnClose } from "../types.js";

interface IReadRequest {
  buffer: Uint8Array,
  mayBeLess: boolean,
  deferred: Deferred<number>
}

/**
 * Node.js Readable Stream Reader
 * Ref: https://nodejs.org/api/stream.html#readable-streams
 */
export class StreamReader extends AbstractStreamReader {

  /**
   * Deferred used for postponed read request (as not data is yet available to read)
   */
  private deferred: Deferred<number> | null = null;

  public constructor(private s: Readable, options?: { onClose?: OnClose }) {
    super(options);
    if (!s.read || !s.once) {
      throw new Error('Expected an instance of stream.Readable');
    }
    this.s.once('end', () => {
      this.endOfStream = true;
      if (this.deferred) {
        this.deferred.resolve(0);
      }
    });
    this.s.once('error', err => this.reject(err));
    this.s.once('close', () => this.abort());
  }

  /**
   * Read chunk from stream
   * @param buffer Target Uint8Array (or Buffer) to store data read from stream in
   * @param mayBeLess - If true, may fill the buffer partially
   * @returns Number of bytes read
   */
  protected async readFromStream(buffer: Uint8Array, mayBeLess: boolean): Promise<number> {

    if (buffer.length === 0) return 0;

    const readBuffer = this.s.read(buffer.length);

    if (readBuffer) {
      buffer.set(readBuffer);
      return readBuffer.length;
    }

    const request = {
      buffer,
      mayBeLess,
      deferred: new Deferred<number>()
    };
    this.deferred = request.deferred;
    this.s.once('readable', () => {
      this.readDeferred(request);
    });
    return request.deferred.promise;
  }

  /**
   * Process deferred read request
   * @param request Deferred read request
   */
  private readDeferred(request: IReadRequest) {
    const readBuffer = this.s.read(request.buffer.length);
    if (readBuffer) {
      request.buffer.set(readBuffer);
      request.deferred.resolve(readBuffer.length);
      this.deferred = null;
    } else {
      this.s.once('readable', () => {
        this.readDeferred(request);
      });
    }
  }

  private reject(err: Error) {
    this.interrupted = true;
    if (this.deferred) {
      this.deferred.reject(err);
      this.deferred = null;
    }
  }

  public async abort(): Promise<void> {
    this.reject(new AbortError());
  }

  async close(): Promise<void> {
    if(!this.closed) {
      await this.abort();
      return super.close();
    }
  }
}
