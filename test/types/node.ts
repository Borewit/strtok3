import { ReadableStream } from 'node:stream/web';
import { fromWebStream, type ITokenizer, type ITokenWriterOptions, TokenWriter } from 'strtok3';
import { TokenWriter as CoreTokenWriter, fromWebStream as fromCoreWebStream } from 'strtok3/core';

// Node.js consumers must type-check without the DOM library or skipLibCheck.
const tokenizer: ITokenizer = fromWebStream(new ReadableStream<Uint8Array>({ type: 'bytes' }));
const coreTokenizer: ITokenizer = fromCoreWebStream(new ReadableStream<Uint8Array>({ type: 'bytes' }));
const writerOptions: ITokenWriterOptions = { maxBufferSize: 1024 };
const writer = new TokenWriter(undefined, writerOptions);
const bytesWritten: number = writer.writeBuffer(new Uint8Array([1, 2, 3]));
const coreWriter: TokenWriter = new CoreTokenWriter(16, { maxBufferSize: 1024 });
coreWriter.writeBytes(new Uint8Array([4]));

void tokenizer;
void coreTokenizer;
void writer;
void bytesWritten;
void coreWriter;
