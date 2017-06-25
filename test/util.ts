// Utilies for testing

const assert = require('assert');
import {Readable} from "stream";

/**
 * A mock stream implementation that breaks up provided data into
 * random-sized chunks and emits 'data' events. This is used to simulate
 * data arriving with arbitrary packet boundaries.
 */
export class SourceStream extends Readable {

  private buf: Buffer;

  constructor(private str: string = '', private min: number = 1, private max: number = str.length) {
    super();

    this.buf = new Buffer(str, 'binary');
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
