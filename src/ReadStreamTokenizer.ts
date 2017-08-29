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

  /**
   * Read buffer from stream
   * @param buffer
   * @param offset is the offset in the buffer to start writing at; if not provided, start at 0
   * @param length is an integer specifying the number of bytes to read
   * @returns Promise number of bytes read
   */
  public readBuffer(buffer: Buffer | Uint8Array, offset?: number, length?: number): Promise<number> {

    if (!length) {
      length = buffer.length;
    }

    return this.streamReader.read(buffer, offset, length)
      .then((bytesRead) => {
        this.position += bytesRead;
        return bytesRead;
      })
      .catch((err) => {
        if (err === StreamReader.EndOfStream) // Convert EndOfStream into EndOfFile
          throw EndOfFile;
        else throw err;
      });
  }

  /**
   * Peek (read ahead) buffer from tokenizer
   * @param buffer
   * @param offset is the offset in the buffer to start writing at; if not provided, start at 0
   * @param length is an integer specifying the number of bytes to read
   * @param position is an integer specifying where to begin reading from in the file. If position is null, data will be read from the current file position.
   * @returns {Promise<TResult|number>}
   */
  public peekBuffer(buffer: Buffer | Uint8Array, offset?: number, length?: number): Promise<number> {

    if (!length) {
      length = buffer.length;
    }

    return this.streamReader.peek(buffer, offset, length)
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
