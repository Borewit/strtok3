import { Readable } from 'node:stream';
import { assert, expect, use } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { UINT8, Uint8ArrayType } from 'token-types';
import { createTokenizerView, EndOfStreamError, fromBuffer, fromStream, fromWebStream } from '../lib/index.js';
import { ReadStreamTokenizer } from '../lib/ReadStreamTokenizer.js';
import type { ITokenizer, ITokenizerOptions } from '../lib/types.js';

use(chaiAsPromised);

const payload = Uint8Array.of(1, 2, 3);
const factories: { name: string; make: (options?: ITokenizerOptions) => ITokenizer | Promise<ITokenizer> }[] = [
  { name: 'Node', make: options => fromStream(Readable.from([payload], { objectMode: false }), options) },
  {
    name: 'web',
    make: options =>
      fromWebStream(
        new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(payload);
            controller.close();
          }
        }),
        options
      )
  },
  {
    name: 'BYOB web',
    make: options =>
      fromWebStream(
        new ReadableStream<Uint8Array>({
          type: 'bytes',
          start(controller) {
            controller.enqueue(Uint8Array.from(payload));
            controller.close();
          }
        }),
        options
      )
  }
];

for (const { name, make } of factories) {
  describe(`Truncated exact ${name} stream operations`, () => {
    for (const depth of [0, 1, 2]) {
      for (const mayBeLess of [false, true]) {
        it(`preflights distant known-EOF peeks without allocating lookahead (view depth ${depth}, mayBeLess=${mayBeLess})`, async () => {
          const source = await make({ fileInfo: { size: payload.length } });
          try {
            await source.ignore(1);
            let input = source;
            for (let level = 0; level < depth; level++) {
              input = createTokenizerView(input, Number.MAX_SAFE_INTEGER - 1);
            }
            const buffer = Uint8Array.of(0xff);
            // Any attempted allocation of this lookahead fails immediately with RangeError.
            const result = input.peekBuffer(buffer, { position: Number.MAX_SAFE_INTEGER - 2, mayBeLess });
            if (mayBeLess) {
              assert.strictEqual(await result, 0);
            } else {
              await expect(result).to.be.rejectedWith(EndOfStreamError);
            }
            assert.deepEqual(buffer, Uint8Array.of(0xff));
            assert.strictEqual(source.position, 1);
            assert.strictEqual(input.position, depth === 0 ? 1 : 0);
            assert.strictEqual(await input.readNumber(UINT8), 2);
          } finally {
            await source.close();
          }
        });
      }
    }

    for (const nested of [false, true]) {
      it(`keeps zero-length skips a no-op beyond the advertised source size (nested=${nested})`, async () => {
        const source = await make({ fileInfo: { size: 1 } });
        try {
          assert.strictEqual(await source.readBuffer(new Uint8Array(2)), 2);
          const input = nested ? createTokenizerView(source, 8).createView(8) : source;
          assert.strictEqual(await input.ignore(0), 0);
          assert.strictEqual(source.position, 2);
          assert.strictEqual(input.position, nested ? 0 : 2);
          await expect(input.ignore(1)).to.be.rejectedWith(EndOfStreamError);
          assert.strictEqual(source.position, 2);
          assert.strictEqual(await input.readNumber(UINT8), 3);
        } finally {
          await source.close();
        }
      });
    }

    for (const nested of [false, true]) {
      for (const method of ['readBuffer', 'peekBuffer'] as const) {
        for (const mayBeLess of [false, true]) {
          it(`preserves ${method} partial EOF behavior with a known size (nested=${nested}, mayBeLess=${mayBeLess})`, async () => {
            const source = await make({ fileInfo: { size: payload.length } });
            try {
              await source.ignore(1);
              const input = nested ? createTokenizerView(source, 8).createView(8) : source;
              const buffer = new Uint8Array(2).fill(0xff);
              const result = input[method](buffer, { position: nested ? 1 : 2, mayBeLess });
              if (mayBeLess) {
                assert.strictEqual(await result, 1);
                assert.deepEqual(buffer, Uint8Array.of(3, 0xff));
              } else {
                await expect(result).to.be.rejectedWith(EndOfStreamError);
              }
              assert.strictEqual(source.position, method === 'readBuffer' ? payload.length : 1);
              if (method === 'peekBuffer') {
                assert.strictEqual(await source.readNumber(UINT8), 2);
              } else {
                assert.strictEqual(await input.readBuffer(buffer, { mayBeLess: true }), 0);
              }
            } finally {
              await source.close();
            }
          });
        }
      }
    }

    for (const depth of [0, 1, 2]) {
      it(`rejects skips beyond the known source size without consuming input (view depth ${depth})`, async () => {
        const tokenizer = await make({ fileInfo: { size: payload.length } });
        try {
          await tokenizer.ignore(1);
          let input = tokenizer;
          for (let level = 0; level < depth; level++) {
            input = createTokenizerView(input, 8 * 1024 * 1024);
          }
          await expect(input.ignore(4 * 1024 * 1024)).to.be.rejectedWith(EndOfStreamError);
          assert.strictEqual(tokenizer.position, 1);
          assert.strictEqual(input.position, depth === 0 ? 1 : 0);
          assert.strictEqual(await input.readNumber(UINT8), 2);
          assert.strictEqual(await input.ignore(1), 1);
          assert.strictEqual(tokenizer.position, payload.length);
          assert.strictEqual(await input.ignore(0), 0);
          await expect(input.ignore(1)).to.be.rejectedWith(EndOfStreamError);
          assert.strictEqual(tokenizer.position, payload.length);
        } finally {
          await tokenizer.close();
        }
      });
    }

    for (const size of [undefined, payload.length + 1]) {
      it(`accounts for consumed skip bytes when EOF is discovered while reading (size=${size})`, async () => {
        const tokenizer = await make({ fileInfo: { size } });
        try {
          await expect(tokenizer.ignore(payload.length + 1)).to.be.rejectedWith(EndOfStreamError);
          assert.strictEqual(tokenizer.position, payload.length);
        } finally {
          await tokenizer.close();
        }
      });
    }

    it('accounts for the bytes consumed by an exact read', async () => {
      const tokenizer = await make();
      try {
        await expect(tokenizer.readToken(new Uint8ArrayType(4))).to.be.rejectedWith(EndOfStreamError);
        assert.strictEqual(tokenizer.position, 3);
        assert.strictEqual(await tokenizer.readBuffer(new Uint8Array(1), { mayBeLess: true }), 0);
      } finally {
        await tokenizer.close();
      }
    });

    for (const mayBeLess of [false, true]) {
      it(`retains its own partial peek bytes when the caller reuses its buffer (mayBeLess=${mayBeLess})`, async () => {
        const tokenizer = await make();
        try {
          const buffer = new Uint8Array(4).fill(0xff);
          const peek = tokenizer.peekBuffer(buffer, { mayBeLess });
          if (mayBeLess) {
            assert.strictEqual(await peek, payload.length);
          } else {
            await expect(peek).to.be.rejectedWith(EndOfStreamError);
          }
          assert.deepEqual(buffer.subarray(0, payload.length), payload);
          assert.strictEqual(buffer[3], 0xff, 'only bytes actually peeked may be copied');
          assert.strictEqual(tokenizer.position, 0);
          buffer.fill(0);
          assert.deepEqual(await tokenizer.readToken(new Uint8ArrayType(payload.length)), payload);
        } finally {
          await tokenizer.close();
        }
      });
    }

    it('retains its own bytes after a successful exact peek', async () => {
      const tokenizer = await make();
      try {
        const buffer = new Uint8Array(2);
        assert.strictEqual(await tokenizer.peekBuffer(buffer), 2);
        buffer.fill(0);
        assert.deepEqual(await tokenizer.readToken(new Uint8ArrayType(payload.length)), payload);
      } finally {
        await tokenizer.close();
      }
    });

    it('keeps partial exact peeks available for a subsequent read', async () => {
      const tokenizer = await make();
      try {
        await expect(tokenizer.peekToken(new Uint8ArrayType(4))).to.be.rejectedWith(EndOfStreamError);
        assert.strictEqual(tokenizer.position, 0);
        assert.strictEqual(await tokenizer.readNumber(UINT8), 1);
        assert.deepEqual(await tokenizer.readToken(new Uint8ArrayType(2)), payload.subarray(1));
      } finally {
        await tokenizer.close();
      }
    });
  });
}

describe('Known-size stream peek I/O', () => {
  for (const size of [0, 3]) {
    for (const position of [size, size + 8]) {
      for (const mayBeLess of [false, true]) {
        for (const maxBufferSize of [undefined, 1]) {
          it(`does not call the reader at/past EOF (size=${size}, position=${position}, mayBeLess=${mayBeLess}, cap=${maxBufferSize})`, async () => {
            const source = new ReadStreamTokenizer(
              {
                read: async () => assert.fail('must not read'),
                peek: async () => assert.fail('must not peek'),
                close: async () => undefined,
                abort: async () => undefined
              },
              { fileInfo: { size }, maxBufferSize }
            );
            try {
              for (const input of [source, createTokenizerView(source, 32).createView(32)]) {
                const buffer = Uint8Array.of(0xff);
                const result = input.peekBuffer(buffer, { position, mayBeLess });
                if (mayBeLess) {
                  assert.strictEqual(await result, 0);
                } else {
                  await expect(result).to.be.rejectedWith(EndOfStreamError);
                }
                assert.deepEqual(buffer, Uint8Array.of(0xff));
                assert.strictEqual(source.position, 0);
                assert.strictEqual(input.position, 0);
                assert.strictEqual(await input.peekBuffer(new Uint8Array(0), { position }), 0);
              }
            } finally {
              await source.close();
            }
          });
        }
      }
    }
  }
});

describe('Known-size stream skip I/O', () => {
  for (const byob of [false, true]) {
    it(`rejects a 4 MiB skip inside an 8 MiB view of a 2 MiB source before pulling (BYOB=${byob})`, async () => {
      const size = 2 * 1024 * 1024;
      let emitted = 0;
      const stream = new ReadableStream<Uint8Array>(
        {
          ...(byob ? { type: 'bytes' as const } : {}),
          pull(controller) {
            if (emitted === size) {
              controller.close();
              return;
            }
            const chunk = new Uint8Array(2048);
            emitted += chunk.length;
            controller.enqueue(chunk);
          }
        },
        { highWaterMark: 0 }
      );
      const source = fromWebStream(stream, { fileInfo: { size } });
      try {
        const view = createTokenizerView(source, 8 * 1024 * 1024);
        await expect(view.ignore(4 * 1024 * 1024)).to.be.rejectedWith(EndOfStreamError);
        await expect(view.consumeRemainder()).to.be.rejectedWith(EndOfStreamError);
        assert.strictEqual(emitted, 0);
        assert.strictEqual(source.position, 0);
        assert.strictEqual(view.remaining, 8 * 1024 * 1024);
        assert.strictEqual(await view.readNumber(UINT8), 0);
        assert.strictEqual(emitted, 2048);
      } finally {
        await source.close();
      }
    });
  }
});

describe('Buffer peeks past underlying EOF', () => {
  it('returns zero for mayBeLess peeks beyond EOF instead of a negative count', async () => {
    const source = fromBuffer(payload);
    assert.strictEqual(await source.peekBuffer(new Uint8Array(1), { position: 5, mayBeLess: true }), 0);
    assert.strictEqual(source.position, 0);
    await expect(source.peekBuffer(new Uint8Array(1), { position: 5 })).to.be.rejectedWith(EndOfStreamError);
    assert.strictEqual(await source.readNumber(UINT8), 1);
  });
});
