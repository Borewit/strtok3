import { ReadableStream } from 'node:stream/web';
import { fromWebStream, type ITokenizer } from 'strtok3';
import { fromWebStream as fromCoreWebStream } from 'strtok3/core';

// Node.js consumers must type-check without the DOM library or skipLibCheck.
const tokenizer: ITokenizer = fromWebStream(new ReadableStream<Uint8Array>({ type: 'bytes' }));
const coreTokenizer: ITokenizer = fromCoreWebStream(new ReadableStream<Uint8Array>({ type: 'bytes' }));

void tokenizer;
void coreTokenizer;
