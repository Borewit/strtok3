import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';
import { assert, expect, use } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import * as Token from 'token-types';
import { BufferSizeError as CoreBufferSizeError } from '../lib/core.js';
import {
  BufferSizeError,
  EndOfStreamError,
  fromBlob,
  fromBuffer,
  fromFile,
  fromStream,
  fromWebStream,
  type ITokenizer,
  type ITokenizerOptions
} from '../lib/index.js';
import { ReadStreamTokenizer } from '../lib/ReadStreamTokenizer.js';
import type { IStreamReader } from '../lib/stream/index.js';

use(chaiAsPromised);

const payload = Uint8Array.from({ length: 256 }, (_, index) => index);
let directory: string;
let filePath: string;

function webStream(bytes: Uint8Array, byob: boolean): ReadableStream<Uint8Array> {
  if (byob) {
    return new ReadableStream<Uint8Array>({
      type: 'bytes',
      start(controller) {
        controller.enqueue(Uint8Array.from(bytes));
        controller.close();
      }
    });
  }
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    }
  });
}

const factories: { name: string; make: (options?: ITokenizerOptions) => ITokenizer | Promise<ITokenizer> }[] = [
  { name: 'buffer', make: options => fromBuffer(payload, options) },
  { name: 'Blob', make: options => fromBlob(new Blob([payload]), options) },
  { name: 'file', make: options => fromFile(filePath, options) },
  { name: 'Node stream', make: options => fromStream(Readable.from([payload], { objectMode: false }), options) },
  { name: 'default web stream', make: options => fromWebStream(webStream(payload, false), options) },
  { name: 'BYOB web stream', make: options => fromWebStream(webStream(payload, true), options) }
];

describe('Maximum dynamically sized buffers', () => {
  before(async () => {
    directory = await mkdtemp(path.join(tmpdir(), 'strtok3-buffer-limit-'));
    filePath = path.join(directory, 'sample.bin');
    await writeFile(filePath, payload);
  });

  after(async () => {
    await rm(directory, { recursive: true, force: true });
  });

  it('exports the same recognizable error from both entry points', () => {
    assert.strictEqual(BufferSizeError, CoreBufferSizeError);
    const error = new BufferSizeError(17, 16);
    assert.instanceOf(error, RangeError);
    assert.strictEqual(error.name, 'BufferSizeError');
    assert.strictEqual(error.requestedSize, 17);
    assert.strictEqual(error.maxBufferSize, 16);
  });

  for (const factory of factories) {
    describe(factory.name, () => {
      for (const method of ['readToken', 'peekToken'] as const) {
        for (const maxBufferSize of [undefined, Number.POSITIVE_INFINITY]) {
          it(`${method} has no default cap and still checks known input bounds (limit ${maxBufferSize})`, async () => {
            const tokenizer = await factory.make({ maxBufferSize, fileInfo: { size: payload.length } });
            tokenizer.readBuffer = async () => assert.fail('must reject before allocation and reading');
            tokenizer.peekBuffer = async () => assert.fail('must reject before allocation and peeking');
            try {
              await expect(tokenizer[method](new Token.Uint8ArrayType(64 * 1024 * 1024 + 1))).to.be.rejectedWith(
                EndOfStreamError
              );
              assert.strictEqual(tokenizer.position, 0);
            } finally {
              await tokenizer.close();
            }
          });
        }

        it(`${method} honors a configured cap, accepts its boundary, and leaves rejected input unread`, async () => {
          const tokenizer = await factory.make({ maxBufferSize: 16 });
          try {
            await expect(tokenizer[method](new Token.Uint8ArrayType(17))).to.be.rejectedWith(
              BufferSizeError,
              'maxBufferSize 16'
            );
            assert.strictEqual(tokenizer.position, 0);
            assert.deepEqual(await tokenizer[method](new Token.Uint8ArrayType(16)), payload.subarray(0, 16));
            assert.strictEqual(tokenizer.position, method === 'readToken' ? 16 : 0);
          } finally {
            await tokenizer.close();
          }
        });

        it(`${method} checks known input size before allocating a below-limit token`, async () => {
          const tokenizer = await factory.make({ maxBufferSize: 1024, fileInfo: { size: payload.length } });
          tokenizer.readBuffer = async () => assert.fail('must reject before allocation and reading');
          tokenizer.peekBuffer = async () => assert.fail('must reject before allocation and peeking');
          try {
            await expect(tokenizer[method](new Token.Uint8ArrayType(257))).to.be.rejectedWith(EndOfStreamError);
          } finally {
            await tokenizer.close();
          }
        });
      }

      it('reuses the constructor cap across successive reads and peeks', async () => {
        const tokenizer = await factory.make({ maxBufferSize: 16 });
        try {
          assert.deepEqual(await tokenizer.readToken(new Token.Uint8ArrayType(8)), payload.subarray(0, 8));
          assert.deepEqual(await tokenizer.peekToken(new Token.Uint8ArrayType(8)), payload.subarray(8, 16));
          await expect(tokenizer.readToken(new Token.Uint8ArrayType(17))).to.be.rejectedWith(BufferSizeError);
          await expect(tokenizer.peekToken(new Token.Uint8ArrayType(17))).to.be.rejectedWith(BufferSizeError);
          assert.strictEqual(tokenizer.position, 8);
          assert.deepEqual(await tokenizer.readToken(new Token.Uint8ArrayType(16)), payload.subarray(8, 24));
        } finally {
          await tokenizer.close();
        }
      });

      it('allows large caller-provided reads and ignores with a smaller internal cap', async () => {
        const tokenizer = await factory.make({ maxBufferSize: 8 });
        try {
          const buffer = new Uint8Array(128);
          assert.strictEqual(await tokenizer.readBuffer(buffer), 128);
          assert.deepEqual(buffer, payload.subarray(0, 128));
          assert.strictEqual(await tokenizer.ignore(127), 127);
          assert.strictEqual(await tokenizer.readToken(Token.UINT8), 255);
        } finally {
          await tokenizer.close();
        }
      });
    });
  }

  for (const length of [-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER + 1]) {
    for (const method of ['readToken', 'peekToken'] as const) {
      it(`${method} rejects invalid token length ${length}`, async () => {
        const tokenizer = fromBuffer(payload);
        await expect(tokenizer[method](new Token.Uint8ArrayType(length))).to.be.rejectedWith(
          RangeError,
          'non-negative safe integer'
        );
        assert.strictEqual(tokenizer.position, 0);
      });
    }
  }

  for (const limit of [0, -1, 1.5, Number.NaN, Number.NEGATIVE_INFINITY, Number.MAX_SAFE_INTEGER + 1]) {
    it(`rejects invalid maxBufferSize ${limit}`, () => {
      assert.throws(
        () => fromBuffer(payload, { maxBufferSize: limit }),
        RangeError,
        'maxBufferSize must be a positive safe integer or Infinity'
      );
    });
  }

  it('rejects invalid web-stream options before locking the stream', () => {
    const stream = webStream(payload, true);
    assert.throws(() => fromWebStream(stream, { maxBufferSize: 0 }), RangeError);
    assert.isFalse(stream.locked);
  });

  it('rejects invalid fromFile options before opening the file', async () => {
    await expect(fromFile(path.join(directory, 'missing.bin'), { maxBufferSize: 0 })).to.be.rejectedWith(
      RangeError,
      'maxBufferSize must be a positive safe integer or Infinity'
    );
  });

  it('allows raising the cap and preserves fromFile options and actual file information', async () => {
    let closed = false;
    const tokenizer = await fromFile(filePath, {
      maxBufferSize: 128,
      fileInfo: { size: 0, mimeType: 'application/octet-stream' },
      onClose: async () => {
        closed = true;
      }
    });
    assert.deepEqual(await tokenizer.readToken(new Token.Uint8ArrayType(128)), payload.subarray(0, 128));
    assert.strictEqual(tokenizer.fileInfo.size, payload.length);
    assert.strictEqual(tokenizer.fileInfo.path, filePath);
    assert.strictEqual(tokenizer.fileInfo.mimeType, 'application/octet-stream');
    await tokenizer.close();
    assert.isTrue(closed);
  });

  it('checks known remaining bytes at an explicit token position', async () => {
    const tokenizer = fromBuffer(payload, { maxBufferSize: 256 });
    await expect(tokenizer.readToken(new Token.Uint8ArrayType(16), 241)).to.be.rejectedWith(EndOfStreamError);
    assert.strictEqual(tokenizer.position, 0);
    assert.deepEqual(await tokenizer.peekToken(new Token.Uint8ArrayType(16), 240), payload.subarray(240));
    assert.strictEqual(await tokenizer.peekToken(Token.UINT8, null), 0);
  });

  it('rejects invalid read options without modifying the input position', async () => {
    const tokenizer = fromBuffer(payload);
    for (const options of [{ length: -1 }, { length: 1.5 }, { length: 9 }, { position: Number.MAX_SAFE_INTEGER }]) {
      await expect(tokenizer.readBuffer(new Uint8Array(8), options)).to.be.rejectedWith(RangeError);
      assert.strictEqual(tokenizer.position, 0);
    }
  });

  for (const byob of [false, true]) {
    it(`preserves partial caller-buffer reads at EOF on ${byob ? 'BYOB' : 'default'} web streams`, async () => {
      const tokenizer = fromWebStream(webStream(payload.subarray(0, 10), byob), { maxBufferSize: 4 });
      try {
        const buffer = new Uint8Array(16);
        assert.strictEqual(await tokenizer.readBuffer(buffer, { mayBeLess: true }), 10);
        assert.strictEqual(tokenizer.position, 10);
        assert.deepEqual(buffer.subarray(0, 10), payload.subarray(0, 10));
      } finally {
        await tokenizer.close();
      }
    });
  }

  it('bounds stream-reader requests during large caller-buffer reads and skips', async () => {
    let position = 0;
    const reader: IStreamReader = {
      read: async buffer => {
        assert.isAtMost(buffer.length, 4);
        const count = Math.min(buffer.length, payload.length - position);
        buffer.set(payload.subarray(position, position + count));
        position += count;
        return count;
      },
      peek: async () => assert.fail('not expected'),
      close: async () => undefined,
      abort: async () => undefined
    };
    const tokenizer = new ReadStreamTokenizer(reader, { maxBufferSize: 4 });
    const buffer = new Uint8Array(128);
    assert.strictEqual(await tokenizer.readBuffer(buffer), 128);
    assert.deepEqual(buffer, payload.subarray(0, 128));
    assert.strictEqual(await tokenizer.ignore(127), 127);
    assert.strictEqual(await tokenizer.readNumber(Token.UINT8), 255);
  });

  it('bounds each Blob arrayBuffer allocation when reading a larger caller buffer', async () => {
    class ObservedBlob extends Blob {
      public slice(start?: number, end?: number, contentType?: string): Blob {
        assert.isAtMost((end ?? this.size) - (start ?? 0), 4);
        return super.slice(start, end, contentType);
      }
    }
    const tokenizer = fromBlob(new ObservedBlob([payload]), { maxBufferSize: 4 });
    const buffer = new Uint8Array(128);
    assert.strictEqual(await tokenizer.readBuffer(buffer), 128);
    assert.deepEqual(buffer, payload.subarray(0, 128));
  });

  it('caps the complete stream lookahead, including a distant offset, before touching the reader', async () => {
    const reader: IStreamReader = {
      read: async () => assert.fail('must not read'),
      peek: async () => assert.fail('must not peek'),
      close: async () => undefined,
      abort: async () => undefined
    };
    const tokenizer = new ReadStreamTokenizer(reader, { maxBufferSize: 16 });
    for (const mayBeLess of [false, true]) {
      await expect(tokenizer.peekBuffer(new Uint8Array(1), { position: 16, mayBeLess })).to.be.rejectedWith(
        BufferSizeError,
        'Requested buffer size 17'
      );
    }
    await expect(tokenizer.peekToken(Token.UINT8, 2 ** 32)).to.be.rejectedWith(BufferSizeError);
    assert.strictEqual(tokenizer.position, 0);
  });

  it('checks the stream token lookahead before allocating its token buffer', async () => {
    const tokenizer = await fromStream(Readable.from([payload], { objectMode: false }), { maxBufferSize: 16 });
    tokenizer.peekBuffer = async () => assert.fail('lookahead must be rejected before allocating the token buffer');
    try {
      await expect(tokenizer.peekToken(new Token.Uint8ArrayType(16), 1)).to.be.rejectedWith(
        BufferSizeError,
        'Requested buffer size 17'
      );
    } finally {
      await tokenizer.close();
    }
  });

  it('preserves stream contents after a boundary lookahead and a rejected larger peek', async () => {
    const tokenizer = await fromStream(Readable.from([payload], { objectMode: false }), { maxBufferSize: 16 });
    try {
      assert.strictEqual(await tokenizer.peekToken(Token.UINT8, 15), 15);
      await expect(tokenizer.peekToken(Token.UINT8, 16)).to.be.rejectedWith(BufferSizeError);
      assert.deepEqual(await tokenizer.readToken(new Token.Uint8ArrayType(16)), payload.subarray(0, 16));
      assert.strictEqual(await tokenizer.peekToken(Token.UINT8, 31), 31);
      assert.strictEqual(tokenizer.position, 16);
    } finally {
      await tokenizer.close();
    }
  });

  it('never returns a negative peek count when a distant mayBeLess peek reaches EOF', async () => {
    const tokenizer = await fromStream(Readable.from([new Uint8Array([1])], { objectMode: false }), {
      maxBufferSize: 16
    });
    try {
      assert.strictEqual(await tokenizer.peekBuffer(new Uint8Array(1), { position: 8, mayBeLess: true }), 0);
      assert.strictEqual(tokenizer.position, 0);
      assert.strictEqual(await tokenizer.readToken(Token.UINT8), 1);
    } finally {
      await tokenizer.close();
    }
  });
});
