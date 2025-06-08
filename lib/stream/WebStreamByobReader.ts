import { WebStreamReader } from './WebStreamReader.js';

/**
 * Read from a WebStream using a BYOB reader
 * Reference: https://nodejs.org/api/webstreams.html#class-readablestreambyobreader
 */
export class WebStreamByobReader extends WebStreamReader {

  /**
   * Read from stream
   * @param buffer - Target Uint8Array (or Buffer) to store data read from stream in
   * @param mayBeLess - If true, may fill the buffer partially
   * @protected Bytes read
   */
  protected async readFromStream(buffer: Uint8Array, mayBeLess: boolean): Promise<number> {

    if (buffer.length === 0) return 0;

    // @ts-ignore
    const result = await this.reader.read(new Uint8Array(buffer.length), {min: mayBeLess ? undefined : buffer.length});

    if (result.done) {
      this.endOfStream = result.done;
    }

    if(result.value) {
      buffer.set(result.value);
      return result.value.length;
    }

    return 0;
  }
}
