import type { OnClose } from '../types.js';
import { AbstractStreamReader } from './AbstractStreamReader.js';

interface WebStreamByteReader {
  // Both Node.js and browser BYOB readers accept non-shared byte buffers.
  read(
    view: Uint8Array<ArrayBuffer>,
    options?: { min?: number }
  ): Promise<{ done: boolean; value?: Uint8Array<ArrayBuffer> }>;
  releaseLock(): void;
}

export abstract class WebStreamReader extends AbstractStreamReader {
  public constructor(
    protected reader: WebStreamByteReader,
    options?: { onClose?: OnClose }
  ) {
    super(options);
  }

  /**
   * Read from stream
   * @param buffer - Target Uint8Array (or Buffer) to store data read from stream in
   * @param mayBeLess - If true, may fill the buffer partially
   * @protected Bytes read
   */
  protected abstract readFromStream(buffer: Uint8Array, mayBeLess: boolean): Promise<number>;

  public async abort(): Promise<void> {
    return this.close();
  }

  public async close(): Promise<void> {
    if (!this.closed) {
      this.reader.releaseLock();
    }
    return super.close();
  }
}
