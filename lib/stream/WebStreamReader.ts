import { AbstractStreamReader } from "./AbstractStreamReader.js";
import type { OnClose } from "../types.js";

export abstract class WebStreamReader extends AbstractStreamReader {

  public constructor(protected reader: ReadableStreamDefaultReader | ReadableStreamBYOBReader, options?: { onClose?: OnClose }) {
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
    if(!this.closed) {
      this.reader.releaseLock();
    }
    return super.close();
  }
}
