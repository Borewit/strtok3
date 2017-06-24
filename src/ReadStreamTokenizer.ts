import {AbstractTokenizer} from "./AbstractTokenizer";
import * as stream from "stream";
import {StreamReader} from "then-read-stream";

export class ReadStreamTokenizer extends AbstractTokenizer {

  private streamReader: StreamReader;

  public constructor(stream: stream.Readable) {
    super();
    this.streamReader = new StreamReader(stream);
  }

  public readBuffer(buffer: Buffer, offset: number, length: number, position: number = null): Promise<number> {
    return this.streamReader.read(buffer, offset, length, position); // ToDo: looks like wrong return type is defined in fs.read
  }

  public static read(stream: stream.Readable): ReadStreamTokenizer {
    return new ReadStreamTokenizer(stream);
  }
}