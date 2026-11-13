import type { OnClose } from '../types.js';
import { AbortError, EndOfStreamError } from './Errors.js';

export interface IStreamReader {
  /**
   * Peek ahead from the stream. Subsequent reads or peeks can return the retained data.
   * The reader borrows the returned prefix of the target: do not mutate it while retained.
   * @param uint8Array - Uint8Array (or Buffer) to store data read from stream in
   * @param mayBeLess - Allow short reads at EOF; may still wait and combine source chunks
   * @returns Number of bytes peeked; only this prefix of the target contains result bytes.
   * Unlike tokenizer methods, a reader may return retained partial data at known EOF even without mayBeLess.
   */
  peek(uint8Array: Uint8Array, mayBeLess?: boolean): Promise<number>;

  /**
   * Read bytes from the stream, consuming retained peek data first.
   * @param uint8Array - Uint8Array (or Buffer) to store data read from stream in
   * @param mayBeLess - Allow short reads at EOF; may still wait and combine source chunks
   * @returns Number of bytes read; only this prefix of the target contains result bytes.
   * Unlike tokenizer methods, a reader may return retained partial data at known EOF even without mayBeLess.
   */
  read(uint8Array: Uint8Array, mayBeLess?: boolean): Promise<number>;

  /*
   * Close underlying resources, claims.
   */
  close(): Promise<void>;

  /**
   * Abort any active asynchronous operation are active, abort those before they may have completed.
   */
  abort(): Promise<void>;
}

export abstract class AbstractStreamReader implements IStreamReader {
  private closePromise?: Promise<void>;
  private readonly onCloseCallback?: OnClose;
  protected endOfStream = false;
  protected interrupted = false;

  public constructor(options?: { onClose?: OnClose }) {
    this.onCloseCallback = options?.onClose;
  }

  /**
   * Store peeked data
   * @type {Array}
   */
  protected peekQueue: Uint8Array[] = [];

  public async peek(uint8Array: Uint8Array, mayBeLess = false): Promise<number> {
    const bytesRead = await this.read(uint8Array, mayBeLess);
    this.peekQueue.push(uint8Array.subarray(0, bytesRead)); // Put read data back to peek buffer
    return bytesRead;
  }

  public async read(buffer: Uint8Array, mayBeLess = false): Promise<number> {
    if (buffer.length === 0) {
      return 0;
    }

    let bytesRead = this.readFromPeekBuffer(buffer);
    if (!this.endOfStream) {
      bytesRead += await this.readRemainderFromStream(buffer.subarray(bytesRead), mayBeLess);
    }
    if (bytesRead === 0 && !mayBeLess) {
      throw new EndOfStreamError();
    }
    return bytesRead;
  }

  /**
   * Read chunk from stream
   * @param buffer - Target Uint8Array (or Buffer) to store data read from stream in
   * @returns Number of bytes read
   */
  protected readFromPeekBuffer(buffer: Uint8Array): number {
    let remaining = buffer.length;
    let bytesRead = 0;
    // consume peeked data first
    while (this.peekQueue.length > 0 && remaining > 0) {
      const peekData = this.peekQueue.pop(); // Front of queue
      if (!peekData) {
        throw new Error('peekData should be defined');
      }
      const lenCopy = Math.min(peekData.length, remaining);
      buffer.set(peekData.subarray(0, lenCopy), bytesRead);
      bytesRead += lenCopy;
      remaining -= lenCopy;
      if (lenCopy < peekData.length) {
        // remainder back to queue
        this.peekQueue.push(peekData.subarray(lenCopy));
      }
    }
    return bytesRead;
  }

  public async readRemainderFromStream(buffer: Uint8Array, mayBeLess: boolean): Promise<number> {
    let bytesRead = 0;
    // Continue reading from stream if required
    while (bytesRead < buffer.length && !this.endOfStream) {
      if (this.interrupted) {
        throw new AbortError();
      }

      const chunkLen = await this.readFromStream(buffer.subarray(bytesRead), mayBeLess);
      if (chunkLen === 0) {
        break;
      }
      bytesRead += chunkLen;
    }
    if (!mayBeLess && bytesRead < buffer.length) {
      throw new EndOfStreamError();
    }
    return bytesRead;
  }

  /**
   * Read from stream
   * @param buffer - Target Uint8Array (or Buffer) to store data read from stream in
   * @param mayBeLess - If true, may fill the buffer partially
   * @protected Bytes read
   */
  protected abstract readFromStream(buffer: Uint8Array, mayBeLess: boolean): Promise<number>;

  /** Share resource cleanup, callback completion and failures across close calls. */
  public close(): Promise<void> {
    this.closePromise ??= Promise.resolve().then(async () => {
      await this.closeResource();
      await this.onCloseCallback?.();
    });
    return this.closePromise;
  }

  /** Backend cleanup completes before the optional close callback. */
  protected closeResource(): Promise<void> {
    return this.abort();
  }

  /**
   * Abort any active asynchronous operation are active, abort those before they may have completed.
   */
  public abstract abort(): Promise<void>;
}
