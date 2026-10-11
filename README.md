[![Node.js CI](https://github.com/Borewit/strtok3/actions/workflows/ci.yml/badge.svg)](https://github.com/Borewit/strtok3/actions/workflows/ci.yml)
[![CodeQL](https://github.com/Borewit/strtok3/actions/workflows/codeql.yml/badge.svg?branch=master)](https://github.com/Borewit/strtok3/actions/workflows/codeql.yml)
[![NPM version](https://badge.fury.io/js/strtok3.svg)](https://npmjs.org/package/strtok3)
[![npm downloads](http://img.shields.io/npm/dm/strtok3.svg)](https://npmcharts.com/compare/strtok3,token-types?start=1200&interval=30)
[![DeepScan grade](https://deepscan.io/api/teams/5165/projects/8526/branches/103329/badge/grade.svg)](https://deepscan.io/dashboard#view=project&tid=5165&pid=8526&bid=103329)
[![Known Vulnerabilities](https://snyk.io/test/github/Borewit/strtok3/badge.svg?targetFile=package.json)](https://snyk.io/test/github/Borewit/strtok3?targetFile=package.json)
[![Codacy Badge](https://api.codacy.com/project/badge/Grade/59dd6795e61949fb97066ca52e6097ef)](https://www.codacy.com/app/Borewit/strtok3?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=Borewit/strtok3&amp;utm_campaign=Badge_Grade)
# strtok3

A promise-based streaming [*tokenizer*](#tokenizer-object) for [Node.js](https://nodejs.org) and browsers.

The `strtok3` module provides several methods for creating a [*tokenizer*](#tokenizer-object) from various input sources. 
Designed for:
* Seamless support in streaming environments.
* Efficiently decode binary data, strings, and numbers.
* Reading [predefined](https://github.com/Borewit/token-types) or custom tokens.
* Offering [*tokenizers*](#tokenizer-object) for reading from [files](#fromfile-function), [streams](#fromstream-function) or [Uint8Arrays](#frombuffer-function).

### Features
`strtok3` can read from:
* Files, using a file path as input.
* Node.js [streams](https://nodejs.org/api/stream.html).
* WHATWG [ReadableStream](https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream) objects containing `Uint8Array` chunks.
* [Buffer](https://nodejs.org/api/buffer.html) or [Uint8Array](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Uint8Array).
* [Blob](https://developer.mozilla.org/en-US/docs/Web/API/Blob) or [File](https://developer.mozilla.org/en-US/docs/Web/API/File) objects.
* HTTP chunked transfer provided by [@tokenizer/http](https://github.com/Borewit/tokenizer-http).
* [Amazon S3](https://aws.amazon.com/s3) chunks with [@tokenizer/s3](https://github.com/Borewit/tokenizer-s3).

## Installation

```sh
npm install strtok3
```

### Compatibility

Starting with version 7, the module has migrated from [CommonJS](https://en.wikipedia.org/wiki/CommonJS) to [pure ECMAScript Module (ESM)](https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c).
The distributed JavaScript codebase is compliant with the [ECMAScript 2020 (11th Edition)](https://en.wikipedia.org/wiki/ECMAScript_version_history#11th_Edition_%E2%80%93_ECMAScript_2020) standard.

Requires a modern browser, Node.js (V8) ≥ 18 engine or Bun (JavaScriptCore) ≥ 1.2.
It can also be used in a browser environment when bundled with a module bundler.

For TypeScript CommonJS backward compatibility, you can use [load-esm](https://github.com/Borewit/load-esm).

Use Node.js 24 LTS to build the project and install development dependencies.
This build requirement is separate from the Node.js ≥ 18 runtime requirement in `package.json`.
CI builds once with Node.js 24, then runs the compiled JavaScript unit tests across the Node.js compatibility matrix and Bun 1.2.x, 1.3.x, and 1.4.x.
Coverage is collected in a separate Node.js 24 job.

For local development, running the TypeScript tests with `tsx` requires Node.js 18.19+ (18.x) or Node.js ≥ 20.6.0.

## Support the Project
If you find this project useful and would like to support its development, consider sponsoring or contributing:

- [Become a sponsor to Borewit](https://github.com/sponsors/Borewit)

- Buy me a coffee:

  <a href="https://www.buymeacoffee.com/borewit" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/default-orange.png" alt="Buy me A coffee" height="41" width="174"></a>

## API Documentation

### strtok3 methods

Use one of the methods to instantiate an [*abstract tokenizer*](#tokenizer-object):
- [fromBlob](#fromblob-function)
- [fromBuffer](#frombuffer-function)
- [fromFile](#fromfile-function)*
- [fromStream](#fromstream-function)*
- [fromWebStream](#fromwebstream-function)

> [!NOTE]
> `fromFile` requires Node.js file-system APIs, and `fromStream` requires a Node.js readable stream.
> In browsers, use `fromBlob`, `fromBuffer`, or `fromWebStream`.

All methods return a [`Tokenizer`](#tokenizer-object), either directly or via a promise.

#### `fromBlob()` function

Create a tokenizer from a [Blob](https://developer.mozilla.org/en-US/docs/Web/API/Blob).

```ts
function fromBlob(blob: Blob, options?: ITokenizerOptions): BlobTokenizer
```

| Parameter | Optional  | Type                                              | Description                                                                            |
|-----------|-----------|---------------------------------------------------|----------------------------------------------------------------------------------------|
| blob      | no        | [Blob](https://developer.mozilla.org/en-US/docs/Web/API/Blob)  | [Blob](https://developer.mozilla.org/en-US/docs/Web/API/Blob) or [File](https://developer.mozilla.org/en-US/docs/Web/API/File) to read from |
| options   | yes       | [ITokenizerOptions](#itokenizeroptions-interface)           | Tokenizer options                                                                      |

Returns a [*tokenizer*](#tokenizer-object).

```js
import { fromBlob } from 'strtok3';
import * as Token from 'token-types';

async function parse() {
  const blob = new Blob([new Uint8Array([42])]);

  const tokenizer = fromBlob(blob);

  const myUint8Number = await tokenizer.readToken(Token.UINT8);
  console.log(`My number: ${myUint8Number}`);   
}

parse();

```

#### `fromBuffer()` function

Create a tokenizer from memory ([Uint8Array](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Uint8Array) or Node.js [Buffer](https://nodejs.org/api/buffer.html)).

```ts
function fromBuffer(uint8Array: Uint8Array, options?: ITokenizerOptions): BufferTokenizer
```

| Parameter  | Optional | Type                                             | Description                       |
|------------|----------|--------------------------------------------------|-----------------------------------|
| uint8Array | no       | [Uint8Array](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Uint8Array) | Buffer or Uint8Array to read from |
| options    | yes      | [ITokenizerOptions](#itokenizeroptions-interface)          | Tokenizer options                 |

Returns a [*tokenizer*](#tokenizer-object).

```js
import { fromBuffer } from 'strtok3';
import * as Token from 'token-types';

const tokenizer = fromBuffer(new Uint8Array([42]));

async function parse() {
  const myUint8Number = await tokenizer.readToken(Token.UINT8);
  console.log(`My number: ${myUint8Number}`);
}

parse();
```

#### `fromFile` function

Creates a [*tokenizer*](#tokenizer-object) from a local file.

```ts
function fromFile(sourceFilePath: string, options?: ITokenizerOptions): Promise<FileTokenizer>
```  

| Parameter      | Type     | Description                |
|----------------|----------|----------------------------|
| sourceFilePath | `string` | Path to file to read from  |
| options | [ITokenizerOptions](#itokenizeroptions-interface) | Optional tokenizer options |

> [!NOTE]
> - Only available for Node.js engines
> - `fromFile` automatically embeds [file information](#ifileinfo-interface)

A Promise resolving to a [*tokenizer*](#tokenizer-object) which can be used to parse a file.

```js
import { fromFile } from 'strtok3';
import * as Token from 'token-types';

async function parse() {
  const tokenizer = await fromFile('somefile.bin');
  try {
    const myNumber = await tokenizer.readToken(Token.UINT8);
    console.log(`My number: ${myNumber}`);
  } finally {
    await tokenizer.close(); // Close the file
  }
}

parse();


```

#### `fromStream()` function

Create a tokenizer from a Node.js [readable stream](https://nodejs.org/api/stream.html#readable-streams) containing binary data.

```ts
function fromStream(stream: Readable, options?: ITokenizerOptions): Promise<ReadStreamTokenizer>
```

| Parameter | Optional | Type | Description |
|-----------|----------|------|-------------|
| stream | no | Readable | Node.js readable stream to read from |
| options | yes | [ITokenizerOptions](#itokenizeroptions-interface) | Tokenizer options |

When importing from `strtok3` in Node.js, returns a promise resolving to a [*tokenizer*](#tokenizer-object).
For streams created by `createReadStream`, the file path and size are added to `tokenizer.fileInfo`.
The `strtok3/core` entry point also exports `fromStream`, but returns the tokenizer synchronously without looking up file information.

```js
import { createReadStream } from 'node:fs';
import { fromStream } from 'strtok3';
import * as Token from 'token-types';

async function parse() {
  const stream = createReadStream('somefile.bin');
  try {
    const tokenizer = await fromStream(stream);
    try {
      const myNumber = await tokenizer.readToken(Token.UINT8);
      console.log(`My number: ${myNumber}`);
    } finally {
      await tokenizer.close();
    }
  } finally {
    stream.destroy();
  }
}

parse();
```

#### `fromWebStream()` function

Create a tokenizer from a [WHATWG ReadableStream](https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream) containing `Uint8Array` chunks.

Uses a BYOB reader when supported by the stream, otherwise a default reader. Source cleanup differs between these readers; see [`close()`](#close-function) and [`abort()`](#abort-function).

```ts
function fromWebStream(webStream: AnyWebByteStream, options?: ITokenizerOptions): ReadStreamTokenizer
```

| Parameter      | Optional | Type                                                                     | Description                        |
|----------------|----------|--------------------------------------------------------------------------|------------------------------------|
| webStream      | no       | [ReadableStream](https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream) | WHATWG ReadableStream to read from |
| options        | yes      | [ITokenizerOptions](#itokenizeroptions-interface)                                   | Tokenizer options                  |

Returns a [*tokenizer*](#tokenizer-object).

```js
import { fromWebStream } from 'strtok3';
import * as Token from 'token-types';

async function parse() {
  const tokenizer = fromWebStream(readableStream);
  try {
    const myUint8Number = await tokenizer.readToken(Token.UINT8);
    console.log(`My number: ${myUint8Number}`);
  } finally {
    await tokenizer.close();
  }
}

parse();
```

### `Tokenizer` object
The *tokenizer* is an abstraction of a [stream](https://nodejs.org/api/stream.html), file or [Uint8Array](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Uint8Array), allowing _reading_ or _peeking_ from the stream.
It can also be translated in chunked reads, as done in [@tokenizer/http](https://github.com/Borewit/tokenizer-http);

#### Key Features:

- Supports seeking within the stream using `tokenizer.ignore()`.
- Offers `peek` methods to preview data without advancing the read pointer.
- Maintains the read position via `tokenizer.position`.
- Supports random access for buffer, blob, and file tokenizers.

#### Tokenizer functions

_Read_ methods advance the stream pointer, while _peek_ methods do not.

There are two kinds of functions:
1. *read* methods: used to read a *token* or bytes into a buffer from the [*tokenizer*](#tokenizer-object). The position of the *tokenizer-stream* will advance with the number of bytes read.
2. *peek* methods: same as the read, but it will *not* advance the pointer. It allows to read (peek) ahead.

#### `readBuffer` function

Read data from the _tokenizer_ into provided "buffer" (`Uint8Array`).
`readBuffer(buffer, options?)`

```ts
readBuffer(buffer: Uint8Array, options?: IReadChunkOptions): Promise<number>;
```

| Parameter  | Type                                                           | Description                                                                                                                                                                                                                            |
|------------|----------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| buffer     | [Buffer](https://nodejs.org/api/buffer.html) &#124; Uint8Array | Target buffer to write the data read to                                                                                                                                                                                                |
| options    | [IReadChunkOptions](#ireadchunkoptions-interface)                        | Optional settings for the length, position, and handling of partial reads |

Return promise with number of bytes read.
The number of bytes read may be less than requested if the `mayBeLess` flag is set.

#### `peekBuffer` function

Peek (read ahead), from [*tokenizer*](#tokenizer-object), into the buffer without advancing the stream pointer.

```ts
peekBuffer(uint8Array: Uint8Array, options?: IReadChunkOptions): Promise<number>;
```

| Parameter  | Type                                    | Description                                         |
|------------|-----------------------------------------|-----------------------------------------------------|
| buffer     | Buffer &#124; Uint8Array                | Target buffer to write the data read (peeked) to.   |
| options    | [IReadChunkOptions](#ireadchunkoptions-interface) | Optional settings for the length, position, and handling of partial reads |

Return value `Promise<number>` Promise with number of bytes read. The number of bytes read may be less if the `mayBeLess` flag was set.

#### `readToken` function

Read a *token* from the tokenizer-stream.

```ts
readToken<Value>(token: IGetToken<Value>, position: number = this.position): Promise<Value>
```  

| Parameter  | Type                    | Description                                                                                                           |
|------------|-------------------------|---------------------------------------------------------------------------------------------------------------------- |
| token      | [IGetToken](#token-object) | Token to read from the tokenizer-stream. |
| position?  | number | Offset where to begin reading. Defaults to `tokenizer.position` when omitted. |

Returns a `Promise<Value>` resolving to the decoded token value. Rejects with `EndOfStreamError` if fewer than `token.len` bytes are available.

#### `peekToken` function

Peek a *token* from the [*tokenizer*](#tokenizer-object).

```ts
peekToken<Value>(token: IGetToken<Value>, position: number | null = this.position): Promise<Value>
```

| Parameter  | Type                       | Description                                                                                                             |
|------------|----------------------------|-------------------------------------------------------------------------------------------------------------------------|
| token      | [IGetToken](#token-object) | Token to peek from the tokenizer-stream. |
| position?  | number &#124; null | Offset where to begin peeking. Defaults to `tokenizer.position` when omitted or `null`. |

Return a promise with the token value peeked from the [*tokenizer*](#tokenizer-object).

#### `readNumber` function

Read a numeric [*token*](#token-object) from the [*tokenizer*](#tokenizer-object).

```ts
readNumber(token: IToken<number>): Promise<number>
```

| Parameter  | Type                            | Description                                        |
|------------|---------------------------------|----------------------------------------------------|
| token      | [IToken<number>](#token-object) | Numeric token to read from the tokenizer-stream.   |

A promise resolving to a numeric value read and decoded from the *tokenizer-stream*.

#### `peekNumber` function

Peek a numeric [*token*](#token-object) without advancing `tokenizer.position`.

```ts
peekNumber(token: IToken<number>): Promise<number>
```

Returns a promise resolving to the decoded numeric value.
Like `readNumber`, rejects with `EndOfStreamError` if the token cannot be read in full.

#### `ignore` function

Advance the offset pointer with the token number of bytes provided.

```ts
ignore(length: number): Promise<number>
```

| Parameter  | Type   | Description                                                      |
|------------|--------|------------------------------------------------------------------|
| length     | number | Non-negative number of bytes to ignore. Advances `tokenizer.position`. |

Returns a promise resolving to the number of bytes ignored.
Buffer, blob, and file tokenizers stop at the known file size. Stream tokenizers reject with `EndOfStreamError` if the requested bytes are unavailable.

#### `close` function
Clean up resources, such as closing a file pointer if applicable.

```ts
close(): Promise<void>
```

Await this method when finished with a tokenizer. For Node.js streams, it does not destroy the underlying stream; the caller remains responsible for its lifecycle.

For Web streams, `close()` releases the reader lock. A BYOB reader leaves the source uncancelled, allowing another reader to continue reading it. A default reader cancels the source before releasing the lock, discarding remaining data. Bytes already read into tokenizer buffers, including peeked bytes, are not returned to the source.

#### `abort` function

Abort pending asynchronous stream operations.

```ts
abort(): Promise<void>
```

This is a no-op for buffer, blob, and file tokenizers.

For Web streams, `abort()` releases a BYOB reader's lock without cancelling the source. A default reader cancels the source but keeps its lock until `close()` is called. An `AbortSignal` invokes the same abort behavior.

#### `supportsRandomAccess` function

```ts
supportsRandomAccess(): boolean
```

Returns `true` for buffer, blob, and file tokenizers, and `false` for stream tokenizers.
When random access is supported, read and peek methods can use positions before `tokenizer.position`.

#### `setPosition` function

Available on buffer, blob, and file tokenizers (`IRandomAccessTokenizer`).

```ts
setPosition(position: number): void
```

Sets the current byte offset without reading data.

#### `Tokenizer` attributes

- `fileInfo`

  Object containing optional file information, see [IFileInfo](#ifileinfo-interface).

- `position`

  Pointer to the current position in the [*tokenizer*](#tokenizer-object) stream.
  For stream tokenizers, a *position* provided to a _read_ or _peek_ method must be at least this value.
  Buffer, blob, and file tokenizers also support earlier positions.

### `ITokenizerOptions` interface

Set these options once when creating a tokenizer. The configured limit applies to subsequent
reads and peeks for that tokenizer; no per-read limit is needed. Each attribute is optional:

| Attribute | Type | Description |
|-----------|------|-------------|
| maxBufferSize | number | Maximum bytes in a dynamically sized tokenizer buffer or stream lookahead span. Disabled by default (`Infinity`). Must be a positive safe integer or `Infinity`. |
| fileInfo | [IFileInfo](#ifileinfo-interface) | Additional metadata about the input |
| onClose | `() => Promise<void>` | Asynchronous callback invoked when a buffer, blob, or file tokenizer is closed |
| abortSignal | [AbortSignal](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal) | Signal used to abort asynchronous stream operations |

Creating a tokenizer with an already-aborted `abortSignal` throws or rejects with `AbortError`
before acquiring file handles or stream readers. Signal listeners are removed when the signal
fires or the tokenizer is closed, so closed tokenizers can be collected even when a signal is reused.

When `maxBufferSize` is configured, `readToken()` and `peekToken()` reject oversized buffers with `BufferSizeError`
before allocating or consuming input. The error exposes `requestedSize` and `maxBufferSize`.
Token lengths and positions must be non-negative safe integers. When the input size is known,
a token extending beyond the input rejects with `EndOfStreamError` before allocation.

For streams, the lookahead limit includes bytes between the current position and the requested
peek position. `mayBeLess: true` does not bypass this limit. With a finite cap, reads into
caller-provided buffers, Blob reads and `ignore()` use bounded chunks where internal buffers
are needed, so their total requested length may exceed `maxBufferSize`.

This limit does not cap total process memory, caller-owned input/output buffers, or allocations
inside a token's `get()` method. Stream sources may also supply chunks larger than this limit.
The cap is opt-in to preserve existing buffer sizes. Applications parsing untrusted input should
set a finite limit, for example 64 MiB. Omit the option or set it to `Infinity` to disable the cap.

```js
import { BufferSizeError, fromFile } from 'strtok3';

const tokenizer = await fromFile('somefile.bin', { maxBufferSize: 64 * 1024 * 1024 });
try {
  // Read or peek tokens here.
} catch (error) {
  if (error instanceof BufferSizeError) {
    console.error(`Requested ${error.requestedSize} bytes; limit is ${error.maxBufferSize}`);
  } else {
    throw error;
  }
} finally {
  await tokenizer.close();
}
```

### `IReadChunkOptions` interface

Each attribute is optional:

| Attribute | Type    | Description                                                                                                                                                                                                                   |
|-----------|---------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| length    | number  | Requested number of bytes to read or peek. Defaults to the target buffer length. |
| position  | number  | Byte offset to read or peek from. Defaults to [tokenizer.position](#tokenizer-attributes) when omitted. Earlier positions require random access. |
| mayBeLess | boolean | If `true`, allows fewer than the requested number of bytes to be read or peeked instead of throwing `EndOfStreamError`. Defaults to `false`. |

Example usage:
```js
  const bytesPeeked = await tokenizer.peekBuffer(buffer, {mayBeLess: true});
```

### `IFileInfo` interface

Provides optional metadata about the file being tokenized.

| Attribute | Type    | Description                                                                                       |
|-----------|---------|---------------------------------------------------------------------------------------------------|
| size      | number  | File size in bytes                                                                                |
| mimeType  | string  | [MIME-type](https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types) of file. |
| path      | string  | File path                                                                                         |
| url       | string  | File URL                                                                                          |

### `Token` object

The *token* is basically a description of what to read from the [*tokenizer-stream*](#tokenizer-object).
A basic set of *token types* can be found here: [*token-types*](https://github.com/Borewit/token-types).

A token is something which implements the following interface:
```ts
export interface IGetToken<T> {

  /**
   * Length in bytes of encoded value
   */
  len: number;

  /**
   * Decode value from buffer at offset
   * @param buf Buffer to read the decoded value from
   * @param off Decode offset
   */
  get(buf: Uint8Array, off: number): T;
}
```
The *tokenizer* reads `token.len` bytes from the *tokenizer-stream* into a Buffer.
The `token.get` will be called with the Buffer. `token.get` is responsible for conversion from the buffer to the desired output type.

### Working with a fetch response

Pass the response's [WHATWG readable stream](https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream) directly to `fromWebStream`.

```js
import { fromWebStream } from 'strtok3';
import * as Token from 'token-types';

(async () => {

  const response = await fetch(url);
  if (!response.ok || !response.body) {
    throw new Error(`Cannot read response: ${response.status}`);
  }

  const tokenizer = fromWebStream(response.body);
  try {
    const myNumber = await tokenizer.readToken(Token.UINT8);
    console.log(`My number: ${myNumber}`);
  } finally {
    await tokenizer.close();
  }
})();
```

## Dependencies

Dependencies:
- [@tokenizer/token](https://github.com/Borewit/tokenizer-token): Provides token definitions and utilities used by `strtok3` for interpreting binary data.

## Contributing

See [the contribution guide](CONTRIBUTING.md) for code style and development commands.

## Licence

This project is licensed under the [MIT License](LICENSE.txt). Feel free to use, modify, and distribute as needed.
