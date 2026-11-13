[![Node.js CI](https://github.com/Borewit/strtok3/actions/workflows/ci.yml/badge.svg)](https://github.com/Borewit/strtok3/actions/workflows/ci.yml)
[![CodeQL](https://github.com/Borewit/strtok3/actions/workflows/codeql.yml/badge.svg?branch=master)](https://github.com/Borewit/strtok3/actions/workflows/codeql.yml)
[![Codecov](https://codecov.io/gh/Borewit/strtok3/branch/master/graph/badge.svg)](https://codecov.io/gh/Borewit/strtok3)
[![NPM version](https://badge.fury.io/js/strtok3.svg)](https://npmjs.org/package/strtok3)
[![npm downloads](http://img.shields.io/npm/dm/strtok3.svg)](https://npmcharts.com/compare/strtok3,token-types?start=1200&interval=30)
[![Socket Badge](https://badge.socket.dev/npm/package/strtok3/latest)](https://badge.socket.dev/npm/package/strtok3/latest)

# strtok3

A promise-based streaming [_tokenizer_](#tokenizer-object) for [Node.js](https://nodejs.org) and browsers.

The `strtok3` module provides several methods for creating a [_tokenizer_](#tokenizer-object) from various input sources.
Designed for:

- Seamless support in streaming environments.
- Efficiently decode binary data, strings, and numbers.
- Reading [predefined](https://github.com/Borewit/token-types) or custom tokens.
- Offering [_tokenizers_](#tokenizer-object) for reading from [files](#fromfile-function), [streams](#fromstream-function) or [Uint8Arrays](#frombuffer-function).

### Features

`strtok3` can read from:

- Files, using a file path as input.
- Node.js [streams](https://nodejs.org/api/stream.html).
- WHATWG [ReadableStream](https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream) objects containing `Uint8Array` chunks.
- [Buffer](https://nodejs.org/api/buffer.html) or [Uint8Array](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Uint8Array).
- [Blob](https://developer.mozilla.org/en-US/docs/Web/API/Blob) or [File](https://developer.mozilla.org/en-US/docs/Web/API/File) objects.
- HTTP chunked transfer provided by [@tokenizer/http](https://github.com/Borewit/tokenizer-http).
- [Amazon S3](https://aws.amazon.com/s3) chunks with [@tokenizer/s3](https://github.com/Borewit/tokenizer-s3).

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
Coverage is collected in a separate Node.js 24 job and uploaded to Codecov.

For local development, running the TypeScript tests with `tsx` requires Node.js 18.19+ (18.x) or Node.js ≥ 20.6.0.

## Support the Project

If you find this project useful and would like to support its development, consider sponsoring or contributing:

- [Become a sponsor to Borewit](https://github.com/sponsors/Borewit)

- Buy me a coffee:

  <a href="https://www.buymeacoffee.com/borewit" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/default-orange.png" alt="Buy me A coffee" height="41" width="174"></a>

## API Documentation

### strtok3 methods

Use one of the methods to instantiate an [_abstract tokenizer_](#tokenizer-object):

- [fromBlob](#fromblob-function)
- [fromBuffer](#frombuffer-function)
- [fromFile](#fromfile-function)
- [fromStream](#fromstream-function)
- [fromWebStream](#fromwebstream-function)
- [createTokenizerView](#createtokenizerview-function)

> [!NOTE]
> `fromFile` requires Node.js file-system APIs, and `fromStream` requires a Node.js readable stream.
> In browsers, use `fromBlob`, `fromBuffer`, or `fromWebStream`.

All methods return a [`Tokenizer`](#tokenizer-object), either directly or via a promise.
The `strtok3/core` entry point exports all factories except `fromFile` and can be used
without Node.js file-system APIs. In browsers, `strtok3` resolves to this core entry point.

#### `fromBlob()` function

Create a tokenizer from a [Blob](https://developer.mozilla.org/en-US/docs/Web/API/Blob).

```ts
function fromBlob(blob: Blob, options?: ITokenizerOptions): BlobTokenizer;
```

| Parameter | Optional | Type                                                          | Description                                                                                                                                 |
| --------- | -------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| blob      | no       | [Blob](https://developer.mozilla.org/en-US/docs/Web/API/Blob) | [Blob](https://developer.mozilla.org/en-US/docs/Web/API/Blob) or [File](https://developer.mozilla.org/en-US/docs/Web/API/File) to read from |
| options   | yes      | [ITokenizerOptions](#itokenizeroptions-interface)             | Tokenizer options                                                                                                                           |

Returns a [_tokenizer_](#tokenizer-object).

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
function fromBuffer(uint8Array: Uint8Array, options?: ITokenizerOptions): BufferTokenizer;
```

| Parameter  | Optional | Type                                                                                                      | Description                       |
| ---------- | -------- | --------------------------------------------------------------------------------------------------------- | --------------------------------- |
| uint8Array | no       | [Uint8Array](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Uint8Array) | Buffer or Uint8Array to read from |
| options    | yes      | [ITokenizerOptions](#itokenizeroptions-interface)                                                         | Tokenizer options                 |

Returns a [_tokenizer_](#tokenizer-object).

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

Creates a [_tokenizer_](#tokenizer-object) from a local file.

```ts
function fromFile(sourceFilePath: string, options?: IFromFileOptions): Promise<FileTokenizer>;
```

| Parameter      | Type                                            | Description                     |
| -------------- | ----------------------------------------------- | ------------------------------- |
| sourceFilePath | `string`                                        | Path to file to read from       |
| options        | [IFromFileOptions](#ifromfileoptions-interface) | Optional file tokenizer options |

> [!NOTE]
> - Only available for Node.js engines
> - `fromFile` automatically embeds [file information](#ifileinfo-interface)

A Promise resolving to a [_tokenizer_](#tokenizer-object) which can be used to parse a file.

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
function fromStream(stream: Readable, options?: ITokenizerOptions): Promise<ReadStreamTokenizer>;
```

| Parameter | Optional | Type                                              | Description                          |
| --------- | -------- | ------------------------------------------------- | ------------------------------------ |
| stream    | no       | Readable                                          | Node.js readable stream to read from |
| options   | yes      | [ITokenizerOptions](#itokenizeroptions-interface) | Tokenizer options                    |

When importing from `strtok3` in Node.js, returns a promise resolving to a [_tokenizer_](#tokenizer-object).
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
function fromWebStream(webStream: AnyWebByteStream, options?: ITokenizerOptions): ReadStreamTokenizer;
```

| Parameter | Optional | Type                                                                              | Description                        |
| --------- | -------- | --------------------------------------------------------------------------------- | ---------------------------------- |
| webStream | no       | [ReadableStream](https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream) | WHATWG ReadableStream to read from |
| options   | yes      | [ITokenizerOptions](#itokenizeroptions-interface)                                 | Tokenizer options                  |

Returns a [_tokenizer_](#tokenizer-object).

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

#### `createTokenizerView()` function

Borrow a finite range of an existing tokenizer without buffering it or taking
ownership of its input. Available from both `strtok3` and `strtok3/core`.

```ts
function createTokenizerView(source: ITokenizer, length: number): ITokenizerView;
```

The view starts at `source.position`, with local `position` zero and
`fileInfo.size` equal to `length`. Creation does not read or skip bytes. The size
is the declared range, so it can exceed the actual remaining input. The outer
file's MIME type, path, and URL are not copied to the view.

```js
import { createTokenizerView, fromBuffer } from 'strtok3';
import { UINT8 } from 'token-types';

const source = fromBuffer(new Uint8Array([10, 20, 30, 40, 50]));
await source.ignore(1);
const chunk = createTokenizerView(source, 3); // source bytes [20, 30, 40]

console.log(await chunk.readToken(UINT8)); // 20; chunk.position = 1
const child = chunk.createView(1); // same as createTokenizerView(chunk, 1)
console.log(await child.readToken(UINT8)); // 30; chunk.position = 2
await child.close(); // source stays open, at position 3

console.log(chunk.remaining); // 1
await chunk.consumeRemainder(); // exactly consume 40, or throw on truncation
await chunk.close();
console.log(await source.readToken(UINT8)); // 50
await source.close();
```

All read and peek positions, including explicit offsets and `setPosition()`, are
relative to the view's start. Nested views must fit inside their parent's
remaining range. A view exposes `setPosition()` and reports random access only
when its source supports it; a stream with a known size remains forward-only.
The overload for an `IRandomAccessTokenizer` returns an
`IRandomAccessTokenizerView`, including for nested `createView()` calls.

A request crossing the declared boundary rejects with `TokenizerBoundaryError`,
a `RangeError` with `position`, `length`, and `size` properties. This applies to
reads, peeks, tokens, and skips, even with `mayBeLess: true`. Invalid lengths,
offsets, and unsafe offset arithmetic reject before allocating token buffers or
consuming input. The source's token allocation and stream lookahead limits still
apply through nested views.

A request inside the view that encounters truncated underlying input rejects
with `EndOfStreamError`. Buffer reads and peeks with `mayBeLess: true` may return
fewer bytes within the requested range; token reads and peeks always require a
complete token. A failed exact read may have consumed part of the input; the
shared cursor reflects the bytes consumed. Peeks do not advance that cursor.

`ignore()` preserves the source's skip behavior, which may return a shorter
count or reject at EOF. Use `consumeRemainder()` when the entire declared
remainder must exist: it returns the number consumed, or rejects with
`EndOfStreamError`. On random-access sources it verifies the final byte and
advances the cursor without reading the whole remainder. On streams it drains
the remainder using the source's bounded skip buffers.

The source, parent, child, and sibling views share one cursor. Use them
sequentially, and close a child before resuming its parent. `close()` is
idempotent, does not drain the remainder, and never closes or aborts the source.
After a partially consumed child closes, the parent resumes at that same byte,
not at the child's declared end. Call `child.consumeRemainder()` before closing
when the parent should resume after the entire child range. Closed views reject
further operations and keep their last local position; closing a parent view
also prevents its children from being used.

Overlapping operations through a view or its parent/child chain are rejected;
`close()` also rejects while that view has an active operation. Direct operations
on the original source, or separate views created from it, cannot be coordinated
by a view, so callers must keep those sequential too. Explicit `abort()`
propagates to the shared source to cancel pending input and affects its other
users; it also closes the view.

### `TokenWriter` class

Serialize binary data synchronously into a growable in-memory buffer with the
same token definitions used for reading.
Available from both `strtok3` and `strtok3/core`.

```ts
const writer = new TokenWriter(); // optional initial capacity in bytes
const cappedWriter = new TokenWriter(undefined, { maxBufferSize: 1024 * 1024 });

writer.length; // bytes written so far
writer.reserve(length); // reserve zero-filled region, returns start offset
writer.writeToken(token, value); // encode a token, returns bytes written
writer.writeBuffer(value); // copy raw bytes, returns bytes written
writer.writeBytes(value); // alias for writeBuffer
writer.writeZeros(length); // append zeros, returns bytes written
writer.patchToken(token, offset, value); // overwrite an earlier region
writer.toUint8Array(); // copy of the written bytes
```

```js
import { TokenWriter } from 'strtok3';
import { UINT24_BE, UINT32_LE } from 'token-types';

const writer = new TokenWriter();
writer.writeToken(UINT32_LE, 0x01020304);
const blockLengthOffset = writer.reserve(3);
const bytesWritten = writer.writeBuffer(new Uint8Array([0xaa, 0xbb])); // 2
writer.patchToken(UINT24_BE, blockLengthOffset, 2);

console.log(writer.length); // 9
const data = writer.toUint8Array(); // Uint8Array(9)
```

Append methods return the number of bytes written, like `readBuffer()` returns
the number read; `writer.length` gives the resulting total. `writeToken()` writes
exactly `token.len` bytes and ignores the encoder's returned offset.
`reserve()` returns the starting offset of a zero-filled region for back-filling
with `patchToken()`. Patching outside the written region throws a `RangeError`;
successful patches leave `length` unchanged and return nothing.

Errors from `put()` propagate without changing the written bytes or `length`:
failed appends clear partial bytes before reuse, and failed patches restore the
original region. Encoders must write synchronously only within `token.len` bytes
starting at the supplied offset and must not retain the destination buffer.

`writeBuffer()` and its `writeBytes()` alias copy their input. `toUint8Array()`
returns a snapshot that can be modified without changing the writer. The writer
buffers the complete output; snapshots allocate another copy of the written bytes.

The optional `maxBufferSize` caps both total output length and backing-buffer
capacity. Like the tokenizer option, it defaults to `Infinity` and must be a
positive safe integer or `Infinity`. Requests exceeding the cap throw
`BufferSizeError` before allocation, encoding or changes to the output.
An explicit initial capacity above the cap is rejected. When omitted, the initial
capacity defaults to 1024 bytes or the cap, whichever is smaller; internal minimum
capacity and buffer growth also respect the cap. Empty appends and in-range patches
remain allowed at the limit. The cap does not bound total process memory, caller
inputs, snapshots, patch rollback copies or encoder allocations.

### `Tokenizer` object

The _tokenizer_ is an abstraction of a [stream](https://nodejs.org/api/stream.html), file or [Uint8Array](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Uint8Array), allowing _reading_ or _peeking_ from the stream.
It can also be translated in chunked reads, as done in [@tokenizer/http](https://github.com/Borewit/tokenizer-http);

#### Key Features:

- Supports seeking within the stream using `tokenizer.ignore()`.
- Offers `peek` methods to preview data without advancing the read pointer.
- Maintains the read position via `tokenizer.position`.
- Supports random access for buffer, blob, and file tokenizers.

#### Tokenizer functions

_Read_ methods advance the stream pointer, while _peek_ methods do not.

There are two kinds of functions:

1. _read_ methods: used to read a _token_ or bytes into a buffer from the [_tokenizer_](#tokenizer-object). After a successful read, `tokenizer.position` is the starting position of the read plus the number of bytes read. An explicit position can skip ahead or, for random-access tokenizers, move backwards.
2. _peek_ methods: same as the read, but it will _not_ advance the pointer. It allows to read (peek) ahead.

Buffer reads and peeks combine transport fragments until the requested range is filled
or EOF is reached. `mayBeLess` changes EOF handling, not completion: it is neither a
single-physical-read option nor a nonblocking read. Other I/O errors still propagate.
A successful short result identifies only the returned prefix of the target as valid;
consumers must check that count before decoding a complete token or signature.

Reads and peeks require the full requested length unless `mayBeLess: true` is passed to
`readBuffer` or `peekBuffer`. Otherwise, insufficient input rejects with the exported
`EndOfStreamError`. Token methods always require the full token.

##### Completion and failure contracts

A resolved exact buffer request returns its requested length. With `mayBeLess: true`,
only `buffer.subarray(0, count)` is the result; the untouched suffix is not input.
For built-in tokenizers, a nonempty short result means EOF prevented filling the
requested range; do not decode it as a complete signature or token. Partial mode
does not mean nonblocking or a single transport chunk. Source errors, invalid
options and allocation/lookahead limits still reject.

| Backend           | Buffer completion with `mayBeLess: true`                                                         | Exact buffer request at physical EOF                                                                                                                          |
| ----------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Buffer / Blob     | Copies all available bytes in the requested range.                                               | Rejects before copying or changing the cursor.                                                                                                                |
| File              | Combines physical reads until the requested range is filled or a zero-byte read establishes EOF. | Both modes retry positive short reads until full or a zero-byte read; on EOF, the target contains the copied prefix and a read cursor includes that progress. |
| Node / Web stream | Can wait for input and combine source chunks, stopping at the requested length or EOF.           | May copy and consume partial input before rejecting; a read cursor includes completed reader calls.                                                           |

Peeks never change the cursor. Stream peeks retain their data independently of the
caller target, including partial bytes retained on exact EOF. A failed forward peek
may leave the target untouched even though lookahead was retained. File peeks do
not retain a snapshot, and buffer tokenizers borrow their source: later source
changes can affect subsequent operations.

Filling across short physical file reads may require additional I/O and encounter
a later error instead of returning the first fragment.

These EOF behaviors are not general I/O-error transactions. On other errors, a
target may be partially modified without a returned count; cursor progress depends
on the backend and which internal calls completed. Do not decode a rejected request.
Token and numeric methods call the decoder only after obtaining the full token;
known-size token checks may reject before any I/O.

Zero-length buffer requests return zero, not evidence of EOF. A zero-length peek
is a no-op; a read with an explicit position still positions there (a stream must
consume the skipped bytes and can reject if they are unavailable). For nonempty
partial requests, zero means no bytes were obtained at the requested position;
for streams, the advertised-size peek shortcut below also applies.

Tokenizer views retain their source's completion and failure behavior, but reject
requests crossing their declared boundary even in partial mode. Declared sizes and
file stat snapshots do not guarantee physical availability. `maxBufferSize` bounds
internal allocations/lookahead, not the length of a caller-provided read buffer;
partial mode does not bypass that limit.

#### `readBuffer` function

Read data from the _tokenizer_ into provided "buffer" (`Uint8Array`).
`readBuffer(buffer, options?)`

```ts
readBuffer(buffer: Uint8Array, options?: IReadChunkOptions): Promise<number>;
```

| Parameter | Type                                                           | Description                                                               |
| --------- | -------------------------------------------------------------- | ------------------------------------------------------------------------- |
| buffer    | [Buffer](https://nodejs.org/api/buffer.html) &#124; Uint8Array | Target buffer to write the data read to                                   |
| options   | [IReadChunkOptions](#ireadchunkoptions-interface)              | Optional settings for the length, position, and handling of partial reads |

Return promise with number of bytes read.
With `mayBeLess: true`, fewer bytes are returned only when EOF prevents filling the requested range.

#### `peekBuffer` function

Peek (read ahead), from [_tokenizer_](#tokenizer-object), into the buffer without advancing the stream pointer.

```ts
peekBuffer(uint8Array: Uint8Array, options?: IReadChunkOptions): Promise<number>;
```

| Parameter | Type                                              | Description                                                               |
| --------- | ------------------------------------------------- | ------------------------------------------------------------------------- |
| buffer    | Buffer &#124; Uint8Array                          | Target buffer to write the data read (peeked) to.                         |
| options   | [IReadChunkOptions](#ireadchunkoptions-interface) | Optional settings for the length, position, and handling of partial reads |

Return value `Promise<number>` with the number of bytes peeked. With `mayBeLess: true`, fewer bytes are returned only when EOF prevents filling the requested range.

For streams with a known size, a nonempty peek starting at or beyond that size
rejects with `EndOfStreamError`, or returns zero with `mayBeLess: true`, before
allocating lookahead or reading input. This also applies through tokenizer views.
Peeks starting inside the advertised input retain their partial-read behavior
when they cross EOF. Zero-length peeks remain no-ops.

#### `readToken` function

Read a _token_ from the tokenizer-stream.

```ts
readToken<Value>(token: IGetToken<Value>, position: number = this.position): Promise<Value>
```

| Parameter | Type                       | Description                                                                   |
| --------- | -------------------------- | ----------------------------------------------------------------------------- |
| token     | [IGetToken](#token-object) | Token to read from the tokenizer-stream.                                      |
| position? | number                     | Offset where to begin reading. Defaults to `tokenizer.position` when omitted. |

Returns a `Promise<Value>` resolving to the decoded token value. Rejects with `EndOfStreamError` if fewer than `token.len` bytes are available.

#### `peekToken` function

Peek a _token_ from the [_tokenizer_](#tokenizer-object).

```ts
peekToken<Value>(token: IGetToken<Value>, position: number | null = this.position): Promise<Value>
```

| Parameter | Type                       | Description                                                                             |
| --------- | -------------------------- | --------------------------------------------------------------------------------------- |
| token     | [IGetToken](#token-object) | Token to peek from the tokenizer-stream.                                                |
| position? | number &#124; null         | Offset where to begin peeking. Defaults to `tokenizer.position` when omitted or `null`. |

Returns a promise with the decoded, complete token. Rejects with `EndOfStreamError`
if fewer than `token.len` bytes are available. The legacy third `maybeless` argument
in the interface is ignored; it does not enable partial token decoding.

#### `readNumber` function

Read a numeric [_token_](#token-object) from the [_tokenizer_](#tokenizer-object).

```ts
readNumber(token: IToken<number>): Promise<number>
```

| Parameter | Type                            | Description                                      |
| --------- | ------------------------------- | ------------------------------------------------ |
| token     | [IToken<number>](#token-object) | Numeric token to read from the tokenizer-stream. |

A promise resolving to a numeric value read and decoded from the _tokenizer-stream_.
Uses a reusable 10-byte buffer, so `token.len` must be at most 10 bytes (including Float80).
For larger tokens or values such as `bigint`, use `readToken` instead.

#### `peekNumber` function

Peek a numeric [_token_](#token-object) without advancing `tokenizer.position`.

```ts
peekNumber(token: IToken<number>): Promise<number>
```

Returns a promise resolving to the decoded numeric value.
Like `readNumber`, rejects with `EndOfStreamError` if the token cannot be read in full.
The same 10-byte token limit applies; use `peekToken` for larger tokens or values such as `bigint`.

#### `ignore` function

Advance the offset pointer by the given number of bytes.

```ts
ignore(length: number): Promise<number>
```

| Parameter | Type   | Description                                                                         |
| --------- | ------ | ----------------------------------------------------------------------------------- |
| length    | number | Non-negative safe integer number of bytes to ignore. Advances `tokenizer.position`. |

Returns a promise resolving to the number of bytes ignored.
Buffer, blob, and file tokenizers stop at the known file size. Stream tokenizers reject with `EndOfStreamError` if the requested bytes are unavailable.
When a stream has a known size, skips beyond that size reject before allocating
a skip buffer or consuming input, including skips through tokenizer views.
If the size is unknown, or the stream ends before its advertised size, a failed
skip may consume available bytes before rejecting; `position` reflects those bytes.

#### `close` function

Clean up resources, such as closing a file pointer if applicable.

```ts
close(): Promise<void>
```

Await this method when finished with a tokenizer. For Node.js streams, it does not destroy the underlying stream; the caller remains responsible for its lifecycle.

For buffer, blob, and file tokenizers, repeated or concurrent `close()` calls
share one cleanup operation and invoke `onClose` at most once. If cleanup or the
callback fails, subsequent calls reject with the same error. Calling `abort()`
before `close()` does not suppress cleanup or the callback.

Closing or aborting a Node.js stream tokenizer removes its reader-retaining
stream listeners. After the source ends, shared error and close guards may remain
until the source emits either event, including after tokenizer closure; these
guards do not retain the tokenizer. The caller remains responsible for handling
subsequent source errors.

For Web streams, `close()` releases the reader lock. A BYOB reader leaves the source uncancelled, allowing another reader to continue reading it. A default reader cancels the source before releasing the lock, discarding remaining data. Bytes already read into tokenizer buffers, including peeked bytes, are not returned to the source.

#### `abort` function

Abort pending asynchronous stream operations.

```ts
abort(): Promise<void>
```

This is a no-op for buffer, blob, and file tokenizers.

For Node.js streams, pending reads reject with the exported `AbortError`, and buffered
peek data is discarded. The underlying stream is not destroyed. Calling `close()` or
aborting the configured `AbortSignal` has the same effect on pending Node.js stream reads.

For Web streams, `abort()` releases a BYOB reader's lock without cancelling the source. A default reader cancels the source but keeps its lock until `close()` is called. An `AbortSignal` invokes the same abort behavior.

#### `supportsRandomAccess` function

```ts
supportsRandomAccess(): boolean
```

Returns `true` for buffer, blob, and file tokenizers, and `false` for stream tokenizers.
When random access is supported, read and peek methods can use positions before `tokenizer.position`.

#### `isRandomAccessTokenizer` helper

Exported from both `strtok3` and `strtok3/core`:

```ts
import { isRandomAccessTokenizer, type ITokenizer } from 'strtok3';

function skipToEnd(tokenizer: ITokenizer): void {
  if (isRandomAccessTokenizer(tokenizer)) {
    tokenizer.setPosition(tokenizer.fileInfo.size);
  }
}
```

Narrows `ITokenizer` to `IRandomAccessTokenizer` by checking `supportsRandomAccess()`,
a callable `setPosition`, and a numeric file size. A known size alone does not imply
random access. Existing third-party implementations can keep returning a boolean
from `supportsRandomAccess()` without changing their interface.

#### `setPosition` function

Available on buffer, blob, and file tokenizers (`IRandomAccessTokenizer`).

```ts
setPosition(position: number): void
```

Sets the current byte offset without reading data. The position must be a
non-negative safe integer; invalid positions throw `RangeError` without changing
the cursor. Seeking past EOF is allowed. At or past EOF, `ignore()` returns zero
without moving the cursor backward, subject to safe end-position arithmetic.

#### `Tokenizer` attributes

- `fileInfo`

  Object containing optional file information, see [IFileInfo](#ifileinfo-interface).

- `position`

  Pointer to the current position in the [_tokenizer_](#tokenizer-object) stream.
  For stream tokenizers, a _position_ provided to a _read_ or _peek_ method must be at least this value.
  Buffer, blob, and file tokenizers also support earlier positions.

### `ITokenizerOptions` interface

Set these options once when creating a tokenizer. The configured limit applies to subsequent
reads and peeks for that tokenizer; no per-read limit is needed. Each attribute is optional:

| Attribute     | Type                                                                        | Description                                                                                                                                                      |
| ------------- | --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| maxBufferSize | number                                                                      | Maximum bytes in a dynamically sized tokenizer buffer or stream lookahead span. Disabled by default (`Infinity`). Must be a positive safe integer or `Infinity`. |
| fileInfo      | [IFileInfo](#ifileinfo-interface)                                           | Additional metadata about the input                                                                                                                              |
| onClose       | `() => Promise<void>`                                                       | Asynchronous callback invoked when a buffer, blob, or file tokenizer is closed                                                                                   |
| abortSignal   | [AbortSignal](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal) | Signal used to abort asynchronous stream operations                                                                                                              |

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

### `IFromFileOptions` interface

Extends [ITokenizerOptions](#itokenizeroptions-interface) for `fromFile()`.

| Attribute       | Type      | Description                                                                                                                                                     |
| --------------- | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| regularFileOnly | `boolean` | When `true`, opens with `O_RDONLY \| O_NONBLOCK` and checks that the opened handle refers to a regular file. Defaults to `false`, preserving existing behavior. |

Use this option when non-regular inputs, such as FIFOs, should be rejected without waiting for a writer. Validation uses the opened handle, so replacing the pathname before opening does not bypass the check. Symbolic links to regular files are accepted.

If an opened handle is not a regular file, `fromFile()` closes it and rejects with the exported `NotRegularFileError`. Its `path` property identifies the requested path. Opening errors, stat errors, and abort errors continue to propagate; any handle acquired by the factory is closed if setup fails. After success, the caller must close the tokenizer.

```js
import { fromFile, NotRegularFileError } from 'strtok3';

try {
  const tokenizer = await fromFile('somefile.bin', { regularFileOnly: true });
  try {
    // Parse the regular file.
  } finally {
    await tokenizer.close();
  }
} catch (error) {
  if (!(error instanceof NotRegularFileError)) {
    throw error;
  }
  // Handle an input that is not a regular file.
}
```

### `IReadChunkOptions` interface

Each attribute is optional:

| Attribute | Type    | Description                                                                                                                                                                           |
| --------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| length    | number  | Requested number of bytes to read or peek. Must be a non-negative safe integer no larger than the target buffer length. Defaults to the target buffer length.                         |
| position  | number  | Byte offset to read or peek from. Must be a non-negative safe integer. Defaults to [tokenizer.position](#tokenizer-attributes) when omitted. Earlier positions require random access. |
| mayBeLess | boolean | If `true`, returns the available byte count at EOF instead of throwing `EndOfStreamError`. Requests still fill the requested range or reach EOF. Defaults to `false`.                 |

Invalid lengths or positions, including a `position + length` that exceeds the safe
integer range, reject with `RangeError`. Requesting an earlier position on a tokenizer
without random access rejects with `Error`. Data is written starting at index 0 of the
target buffer. To write at an offset, pass `buffer.subarray(offset)` as the target buffer.

Example usage (checking a complete bounded header):

```js
const header = new Uint8Array(4);
const count = await tokenizer.peekBuffer(header, { mayBeLess: true });
if (count === header.length) {
  // It is safe to inspect all four header bytes.
} else {
  // Only header.subarray(0, count) is valid; the header is not complete.
  // EOF prevented completion; do not decode this as a complete header.
}
```

See [completion and failure contracts](#completion-and-failure-contracts) for
backend-specific guarantees.

### `IFileInfo` interface

Provides optional metadata about the file being tokenized.

| Attribute | Type   | Description                                                                                       |
| --------- | ------ | ------------------------------------------------------------------------------------------------- |
| size      | number | File size in bytes                                                                                |
| mimeType  | string | [MIME-type](https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types) of file. |
| path      | string | File path                                                                                         |
| url       | string | File URL                                                                                          |

### `Token` object

The _token_ is basically a description of what to read from the [_tokenizer-stream_](#tokenizer-object).
A basic set of _token types_ can be found here: [_token-types_](https://github.com/Borewit/token-types).

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
The _tokenizer_ reads `token.len` bytes from the _tokenizer-stream_ into a Buffer.
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
