import { AbstractStreamReader } from "./AbstractStreamReader.js";

export abstract class WebStreamReader extends AbstractStreamReader {

  public constructor(protected reader: ReadableStreamDefaultReader | ReadableStreamBYOBReader) {
    super();
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
    this.reader.releaseLock();
  }
}
