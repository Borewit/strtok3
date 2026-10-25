import type { Readable } from 'node:stream';
import { AbstractStreamReader } from './AbstractStreamReader.js';
import { Deferred } from './Deferred.js';
import { AbortError } from './Errors.js';

interface IReadRequest {
  buffer: Uint8Array;
  mayBeLess: boolean;
  deferred: Deferred<number>;
  onReadable: () => void;
}

function handlePostEndError(this: Readable): void {
  this.removeListener('close', removePostEndErrorHandler);
}

function removePostEndErrorHandler(this: Readable): void {
  this.removeListener('error', handlePostEndError);
}

/**
 * Node.js Readable Stream Reader
 * Ref: https://nodejs.org/api/stream.html#readable-streams
 */
export class StreamReader extends AbstractStreamReader {
  /**
   * Pending requests waiting for data, tracked until completion or cancellation
   */
  private pendingRequests = new Set<IReadRequest>();

  private onEnd = (): void => {
    this.endOfStream = true;
    this.removeLifecycleListeners();
    // Auto-destruction may emit an error after `end`. These shared handlers do
    // not retain this reader when `emitClose` is disabled.
    this.s.once('error', handlePostEndError);
    this.s.once('close', removePostEndErrorHandler);
    for (const request of this.pendingRequests) {
      this.removeRequest(request);
      request.deferred.resolve(0);
    }
  };

  private onError = (err: Error): void => this.reject(err);

  private onClose = (): void => {
    this.removeLifecycleListeners();
    // Normal EOF may leave peeked bytes that the caller still needs to consume.
    if (!this.endOfStream) {
      void this.abort();
    }
  };

  public constructor(private s: Readable) {
    super();
    if (!s.read || !s.once) {
      throw new Error('Expected an instance of stream.Readable');
    }
    this.s.once('end', this.onEnd);
    this.s.once('error', this.onError);
    this.s.once('close', this.onClose);
  }

  /**
   * Read chunk from stream
   * @param buffer Target Uint8Array (or Buffer) to store data read from stream in
   * @param mayBeLess - If true, may fill the buffer partially
   * @returns Number of bytes read
   */
  protected async readFromStream(buffer: Uint8Array, mayBeLess: boolean): Promise<number> {
    if (buffer.length === 0) {
      return 0;
    }

    const readBuffer = this.s.read(buffer.length);

    if (readBuffer) {
      buffer.set(readBuffer);
      return readBuffer.length;
    }

    const request: IReadRequest = {
      buffer,
      mayBeLess,
      deferred: new Deferred<number>(),
      onReadable: () => this.readDeferred(request)
    };
    this.pendingRequests.add(request);
    this.s.once('readable', request.onReadable);
    return request.deferred.promise;
  }

  /**
   * Process deferred read request
   * @param request Deferred read request
   */
  private readDeferred(request: IReadRequest) {
    if (this.interrupted || !this.pendingRequests.has(request)) {
      return;
    }
    try {
      const readBuffer = this.s.read(request.buffer.length);
      // Reading may synchronously emit an error or close event that cancels the request.
      if (!this.pendingRequests.has(request)) {
        return;
      }
      if (readBuffer) {
        request.buffer.set(readBuffer);
        this.removeRequest(request);
        request.deferred.resolve(readBuffer.length);
      } else {
        this.s.once('readable', request.onReadable);
      }
    } catch (error) {
      this.reject(error instanceof Error ? error : new Error(String(error)));
    }
  }

  private removeRequest(request: IReadRequest): void {
    this.s.removeListener('readable', request.onReadable);
    this.pendingRequests.delete(request);
  }

  private removeLifecycleListeners(): void {
    this.s.removeListener('end', this.onEnd);
    this.s.removeListener('error', this.onError);
    this.s.removeListener('close', this.onClose);
  }

  private reject(err: Error) {
    this.removeLifecycleListeners();
    this.interrupted = true;
    this.peekQueue = [];
    for (const request of this.pendingRequests) {
      this.removeRequest(request);
      request.deferred.reject(err);
    }
  }

  public async abort(): Promise<void> {
    this.reject(new AbortError());
  }

  async close(): Promise<void> {
    return this.abort();
  }
}
