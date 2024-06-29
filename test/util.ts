// Utility functions for testing
import { Readable } from 'node:stream';
import { stringToUint8Array } from 'uint8array-extras';

/**
 * A mock stream implementation that breaks up provided data into
 * random-sized chunks and emits 'data' events. This is used to simulate
 * data arriving with arbitrary packet boundaries.
 */
export class SourceStream extends Readable {

  public static FromString(str: string = ''): SourceStream {
    return new SourceStream(stringToUint8Array(str));
  }

  public constructor(private buf: Uint8Array) {
    super();
  }

  public _read() {

    /* ToDo: segment data
     const len = Math.min(
     this.min + Math.floor(Math.random() * (this.max - this.min)),
     this.buf.length
     );

     const b = this.buf.slice(0, len);

     if (len < this.buf.length) {
     this.buf = this.buf.slice(len, this.buf.length);
     this.push(b);
     } else {
     this.push(null); // push the EOF-signaling `null` chunk
     }*/

    this.push(this.buf);
    this.push(null); // push the EOF-signaling `null` chunk
  }

}
