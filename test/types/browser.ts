import { fromWebStream, type ITokenizer } from 'strtok3';
import { fromWebStream as fromCoreWebStream } from 'strtok3/core';
import { WebStreamByobReader } from '../../lib/stream/WebStreamByobReader.js';

// Browser streams and BYOB readers must remain compatible with the shared byte-reader contract.
const tokenizer: ITokenizer = fromWebStream(new ReadableStream<Uint8Array>({ type: 'bytes' }));
const coreTokenizer: ITokenizer = fromCoreWebStream(new ReadableStream<Uint8Array>({ type: 'bytes' }));
const reader = new WebStreamByobReader(new ReadableStream<Uint8Array>({ type: 'bytes' }).getReader({ mode: 'byob' }));

void tokenizer;
void coreTokenizer;
void reader;
