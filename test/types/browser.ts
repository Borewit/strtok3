import { fromWebStream, type ITokenizer, type ITokenWriterOptions, TokenWriter } from 'strtok3';
import { TokenWriter as CoreTokenWriter, fromWebStream as fromCoreWebStream } from 'strtok3/core';
import { WebStreamByobReader } from '../../lib/stream/WebStreamByobReader.js';

// Browser streams and BYOB readers must remain compatible with the shared byte-reader contract.
const tokenizer: ITokenizer = fromWebStream(new ReadableStream<Uint8Array>({ type: 'bytes' }));
const coreTokenizer: ITokenizer = fromCoreWebStream(new ReadableStream<Uint8Array>({ type: 'bytes' }));
const reader = new WebStreamByobReader(new ReadableStream<Uint8Array>({ type: 'bytes' }).getReader({ mode: 'byob' }));
const writerOptions: ITokenWriterOptions = { maxBufferSize: 1024 };
const writer = new TokenWriter(undefined, writerOptions);
const bytesWritten: number = writer.writeBuffer(new Uint8Array([1, 2, 3]));
const coreWriter: TokenWriter = new CoreTokenWriter(16, { maxBufferSize: 1024 });
coreWriter.writeBytes(new Uint8Array([4]));

void tokenizer;
void coreTokenizer;
void reader;
void writer;
void bytesWritten;
void coreWriter;
