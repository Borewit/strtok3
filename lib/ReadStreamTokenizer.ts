import {AbstractTokenizer} from "./AbstractTokenizer";
import {EndOfFile} from "./";
import {StreamReader} from "then-read-stream";
import * as Stream from "stream";

export class ReadStreamTokenizer extends AbstractTokenizer {

  private streamReader: StreamReader;

  public constructor(stream: Stream.Readable, fileSize?: number) {
    super();
    this.streamReader = new StreamReader(stream);
    this.fileSize = fileSize;
  }

  public readBuffer(buffer: Buffer, offset: number, length: number, position: number = null): Promise<number> {
    return this.streamReader.read(buffer, offset, length, position) // ToDo: looks like wrong return type is defined in fs.read
      .catch((err) => {
        if (err === StreamReader.EndOfStream) // Convert EndOfStream into EndOfFile
          throw EndOfFile;
        else throw err;
      });
  }

  public ignore(length: number): Promise<void> {
    const buf = new Buffer(length);
    return this.streamReader.read(buf, 0, length).then(() => null); // Stream cannot skip data
  }
}
