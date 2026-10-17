import { mkdtemp, rm, truncate, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';
import { assert, expect, use } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { UINT8, UINT32_BE, Uint8ArrayType } from 'token-types';
import { TokenizerBoundaryError as CoreBoundaryError, createTokenizerView as coreCreateView } from '../lib/core.js';
import {
  BufferSizeError,
  createTokenizerView,
  EndOfStreamError,
  fromBlob,
  fromBuffer,
  fromFile,
  fromStream,
  fromWebStream,
  type IRandomAccessTokenizerView,
  type ITokenizer,
  type ITokenizerOptions,
  TokenizerBoundaryError
} from '../lib/index.js';

use(chaiAsPromised);

const bytes = Uint8Array.from({ length: 16 }, (_, index) => index);
let directory: string;
let fileNumber = 0;

function webStream(data: Uint8Array, byob: boolean): ReadableStream<Uint8Array> {
  if (byob) {
    return new ReadableStream<Uint8Array>({
      type: 'bytes',
      start(controller) {
        controller.enqueue(Uint8Array.from(data));
        controller.close();
      }
    });
  }
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(data);
      controller.close();
    }
  });
}

const factories: {
  name: string;
  random: boolean;
  make: (data?: Uint8Array, options?: ITokenizerOptions) => ITokenizer | Promise<ITokenizer>;
}[] = [
  { name: 'buffer', random: true, make: (data, options) => fromBuffer(data ?? bytes, options) },
  {
    name: 'Blob',
    random: true,
    make: (data, options) => fromBlob(new Blob([Uint8Array.from(data ?? bytes)]), options)
  },
  {
    name: 'file',
    random: true,
    make: async (data, options) => {
      const filePath = path.join(directory, `${fileNumber++}.bin`);
      await writeFile(filePath, data ?? bytes);
      return fromFile(filePath, options);
    }
  },
  {
    name: 'Node stream',
    random: false,
    make: (data, options) => fromStream(Readable.from([data ?? bytes], { objectMode: false }), options)
  },
  {
    name: 'web stream',
    random: false,
    make: (data, options) => fromWebStream(webStream(data ?? bytes, false), options)
  },
  {
    name: 'BYOB web stream',
    random: false,
    make: (data, options) => fromWebStream(webStream(data ?? bytes, true), options)
  }
];

describe('Finite tokenizer views', () => {
  before(async () => {
    directory = await mkdtemp(path.join(tmpdir(), 'strtok3-view-'));
  });
  after(async () => {
    await rm(directory, { recursive: true, force: true });
  });

  it('exports the factory and boundary error from both entry points', () => {
    assert.strictEqual(createTokenizerView, coreCreateView);
    assert.strictEqual(TokenizerBoundaryError, CoreBoundaryError);
    const error = new TokenizerBoundaryError(3, 2, 4);
    assert.instanceOf(error, RangeError);
    assert.notInstanceOf(error, EndOfStreamError);
    assert.include(error, { name: 'TokenizerBoundaryError', position: 3, length: 2, size: 4 });
  });

  it('preserves random-access capability in factory and nested return types', () => {
    const view: IRandomAccessTokenizerView = createTokenizerView(fromBuffer(bytes), 8);
    const child: IRandomAccessTokenizerView = view.createView(4);
    child.setPosition(2);
    assert.strictEqual(view.position, 2);
  });

  for (const { name, random, make } of factories) {
    describe(name, () => {
      it('starts locally at zero, advertises the declared size, and borrows the cursor', async () => {
        const source = await make(undefined, { fileInfo: { mimeType: 'outer/type', path: 'outer.file' } });
        try {
          await source.ignore(3);
          const view = createTokenizerView(source, 5);
          assert.strictEqual(source.position, 3, 'construction must not consume input');
          assert.strictEqual(view.position, 0);
          assert.strictEqual(view.remaining, 5);
          assert.deepEqual(view.fileInfo, { size: 5 });
          assert.strictEqual(view.supportsRandomAccess(), random);
          assert.strictEqual('setPosition' in view, random);
          assert.strictEqual(await view.peekNumber(UINT8), 3);
          assert.strictEqual(view.position, 0);
          assert.strictEqual(await view.readNumber(UINT8), 3);
          assert.strictEqual(view.position, 1);
          assert.strictEqual(source.position, 4);
          assert.strictEqual(view.remaining, 4);
        } finally {
          await source.close();
        }
      });

      it('does not infer random access from a known size', async () => {
        const source = await make(undefined, { fileInfo: { size: bytes.length } });
        try {
          const view = createTokenizerView(source, 8);
          assert.strictEqual(view.fileInfo.size, 8);
          assert.strictEqual(view.supportsRandomAccess(), random);
          assert.strictEqual('setPosition' in view, random);
        } finally {
          await source.close();
        }
      });

      it('translates explicit read and peek positions, including null token positions', async () => {
        const source = await make();
        try {
          await source.ignore(2);
          const view = createTokenizerView(source, 8);
          assert.strictEqual(await view.peekToken(UINT8, 3), 5);
          assert.strictEqual(await view.peekToken(UINT8, null), 2);
          assert.strictEqual(view.position, 0);
          const buffer = new Uint8Array(2);
          assert.strictEqual(await view.peekBuffer(buffer, { position: 2 }), 2);
          assert.deepEqual(buffer, bytes.subarray(4, 6));
          assert.strictEqual(await view.readToken(UINT8, 3), 5);
          assert.strictEqual(view.position, 4);
          assert.strictEqual(source.position, 6);
          if (random && 'setPosition' in view) {
            const randomView = view as IRandomAccessTokenizerView;
            randomView.setPosition(0);
            assert.strictEqual(source.position, 2);
            assert.strictEqual(await view.readNumber(UINT8), 2);
            assert.strictEqual(await view.peekToken(UINT8, 0), 2);
            randomView.setPosition(8);
            assert.strictEqual(source.position, 10);
            assert.throws(() => randomView.setPosition(9), TokenizerBoundaryError);
            assert.strictEqual(view.position, 8);
          } else {
            await expect(view.readToken(UINT8, 0)).to.be.rejectedWith('equal or greater');
            await expect(view.peekToken(UINT8, 0)).to.be.rejectedWith('equal or greater');
            assert.strictEqual(view.position, 4);
          }
        } finally {
          await source.close();
        }
      });

      for (const mayBeLess of [false, true]) {
        for (const method of ['readBuffer', 'peekBuffer'] as const) {
          it(`${method} rejects boundary overreads even with mayBeLess=${mayBeLess}`, async () => {
            const source = await make();
            try {
              await source.ignore(2);
              const view = createTokenizerView(source, 4);
              const buffer = new Uint8Array(5).fill(0xff);
              await expect(view[method](buffer, { mayBeLess })).to.be.rejectedWith(TokenizerBoundaryError);
              await expect(view[method](new Uint8Array(1), { position: 4, mayBeLess })).to.be.rejectedWith(
                TokenizerBoundaryError
              );
              assert.strictEqual(source.position, 2);
              assert.deepEqual(buffer, new Uint8Array(5).fill(0xff));
              assert.strictEqual(await view.readNumber(UINT8), 2);
            } finally {
              await source.close();
            }
          });
        }
      }

      it('checks tokens, numeric tokens, ignores, and nested creation before touching the source', async () => {
        const source = await make();
        try {
          const view = createTokenizerView(source, 3);
          await expect(view.readToken(new Uint8ArrayType(Number.MAX_SAFE_INTEGER))).to.be.rejectedWith(
            TokenizerBoundaryError
          );
          await expect(view.peekToken(new Uint8ArrayType(4))).to.be.rejectedWith(TokenizerBoundaryError);
          await expect(view.readNumber(UINT32_BE)).to.be.rejectedWith(TokenizerBoundaryError);
          await expect(view.peekNumber(UINT32_BE)).to.be.rejectedWith(TokenizerBoundaryError);
          await expect(view.ignore(4)).to.be.rejectedWith(TokenizerBoundaryError);
          assert.throws(() => view.createView(4), TokenizerBoundaryError);
          assert.throws(() => createTokenizerView(view, 4), TokenizerBoundaryError);
          assert.strictEqual(source.position, 0);
          assert.strictEqual(await view.readNumber(UINT8), 0);
        } finally {
          await source.close();
        }
      });

      it('composes nested ranges and consumes their exact remainders without crossing siblings', async () => {
        const source = await make();
        try {
          await source.ignore(2);
          const parent = createTokenizerView(source, 10);
          await parent.ignore(1);
          const child = parent.createView(4);
          await child.ignore(1);
          const grandchild = createTokenizerView(child, 2);
          assert.deepEqual(await grandchild.readToken(new Uint8ArrayType(2)), bytes.subarray(4, 6));
          assert.strictEqual(grandchild.remaining, 0);
          await expect(grandchild.readNumber(UINT8)).to.be.rejectedWith(TokenizerBoundaryError);
          await grandchild.close();
          assert.strictEqual(child.position, 3);
          assert.strictEqual(parent.position, 4);
          assert.strictEqual(await child.consumeRemainder(), 1);
          assert.strictEqual(await child.consumeRemainder(), 0);
          await child.close();
          assert.strictEqual(parent.position, 5);
          assert.strictEqual(await parent.readNumber(UINT8), 7);
          assert.strictEqual(await parent.consumeRemainder(), 4);
          await parent.close();
          assert.strictEqual(source.position, 12);
          assert.strictEqual(await source.readNumber(UINT8), 12);
        } finally {
          await source.close();
        }
      });

      it('resumes at a partially consumed child without draining or closing the source', async () => {
        let closed = false;
        const source = await make(undefined, {
          onClose: async () => {
            closed = true;
          }
        });
        try {
          const parent = createTokenizerView(source, 8);
          await parent.ignore(1);
          const child = parent.createView(4);
          assert.strictEqual(await child.readNumber(UINT8), 1);
          await child.close();
          await child.close();
          assert.isFalse(closed);
          assert.strictEqual(parent.position, 2);
          assert.strictEqual(await parent.readNumber(UINT8), 2);
          assert.strictEqual(child.position, 1, 'a closed view keeps its last local position');
          await expect(child.readNumber(UINT8)).to.be.rejectedWith('closed');
          await expect(child.consumeRemainder()).to.be.rejectedWith('closed');
          assert.throws(() => child.createView(1), /closed/);
          await parent.close();
          assert.strictEqual(await source.readNumber(UINT8), 3);
        } finally {
          await source.close();
        }
      });

      it('supports empty ranges and zero-length operations at the boundary', async () => {
        const source = await make();
        try {
          await source.ignore(3);
          const view = createTokenizerView(source, 0);
          assert.strictEqual(await view.readBuffer(new Uint8Array(0)), 0);
          assert.strictEqual(await view.peekBuffer(new Uint8Array(0)), 0);
          assert.strictEqual(await view.ignore(0), 0);
          assert.strictEqual(await view.consumeRemainder(), 0);
          await expect(view.readNumber(UINT8)).to.be.rejectedWith(TokenizerBoundaryError);
          assert.strictEqual(source.position, 3);
        } finally {
          await source.close();
        }
      });

      it('distinguishes truncated underlying reads and peeks from a view overread', async () => {
        const source = await make(bytes.subarray(0, 3));
        try {
          const view = createTokenizerView(source, 5);
          await expect(view.peekToken(new Uint8ArrayType(4))).to.be.rejectedWith(EndOfStreamError);
          assert.strictEqual(source.position, 0);
          assert.deepEqual(await view.readToken(new Uint8ArrayType(2)), bytes.subarray(0, 2));
          await expect(view.readBuffer(new Uint8Array(2))).to.be.rejectedWith(EndOfStreamError);
        } finally {
          await source.close();
        }
      });

      it('returns partial input only when mayBeLess is requested within the view', async () => {
        const source = await make(bytes.subarray(0, 3));
        try {
          const view = createTokenizerView(source, 6);
          const buffer = new Uint8Array(4);
          assert.strictEqual(await view.peekBuffer(buffer, { mayBeLess: true }), 3);
          assert.strictEqual(view.position, 0);
          assert.strictEqual(await view.readBuffer(buffer, { mayBeLess: true }), 3);
          assert.strictEqual(view.position, 3);
          assert.strictEqual(view.remaining, 3);
          assert.strictEqual(await view.peekBuffer(new Uint8Array(1), { position: 5, mayBeLess: true }), 0);
        } finally {
          await source.close();
        }
      });

      it('rejects a truncated exact remainder, including inside a nested view', async () => {
        const source = await make(bytes.subarray(0, 3));
        try {
          const parent = createTokenizerView(source, 8);
          const child = parent.createView(5);
          await expect(child.consumeRemainder()).to.be.rejectedWith(EndOfStreamError);
          assert.isAtMost(source.position, 3);
          assert.strictEqual(parent.position, source.position);
          assert.strictEqual(child.position, source.position);
        } finally {
          await source.close();
        }
      });

      it('preserves the source token allocation cap through nested views', async () => {
        const source = await make(undefined, { maxBufferSize: 4 });
        try {
          const child = createTokenizerView(source, 16).createView(8);
          await expect(child.readToken(new Uint8ArrayType(5))).to.be.rejectedWith(BufferSizeError);
          await expect(child.peekToken(new Uint8ArrayType(5))).to.be.rejectedWith(BufferSizeError);
          assert.strictEqual(source.position, 0);
          assert.deepEqual(await child.readToken(new Uint8ArrayType(4)), bytes.subarray(0, 4));
        } finally {
          await source.close();
        }
      });
    });
  }

  for (const value of [-1, 0.5, Number.NaN, Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER + 1]) {
    it(`rejects invalid lengths and offsets (${value}) without consuming input`, async () => {
      const source = fromBuffer(bytes);
      const view = createTokenizerView(source, 8);
      assert.throws(() => createTokenizerView(source, value), RangeError);
      assert.throws(() => view.createView(value), RangeError);
      assert.throws(() => view.setPosition(value), RangeError);
      await expect(view.ignore(value)).to.be.rejectedWith(RangeError);
      await expect(view.readToken(new Uint8ArrayType(value))).to.be.rejectedWith(RangeError);
      await expect(view.peekToken(UINT8, value)).to.be.rejectedWith(RangeError);
      await expect(view.readBuffer(new Uint8Array(1), { length: value })).to.be.rejectedWith(RangeError);
      await expect(view.peekBuffer(new Uint8Array(1), { position: value })).to.be.rejectedWith(RangeError);
      assert.strictEqual(source.position, 0);
    });
  }

  it('validates absolute range arithmetic before consuming input', async () => {
    const source = fromBuffer(bytes);
    source.setPosition(Number.MAX_SAFE_INTEGER);
    assert.throws(() => createTokenizerView(source, 1), RangeError, 'end position');
    source.setPosition(1);
    assert.throws(() => createTokenizerView(source, Number.MAX_SAFE_INTEGER), RangeError, 'end position');
    assert.strictEqual(source.position, 1);
    source.setPosition(Number.NaN);
    assert.throws(() => createTokenizerView(source, 0), RangeError, 'source position');
  });

  it('rejects caller-buffer length mismatches before seeking on a stream', async () => {
    const source = await fromStream(Readable.from([bytes], { objectMode: false }));
    try {
      const view = createTokenizerView(source, 16);
      await expect(view.readBuffer(new Uint8Array(1), { length: 2, position: 5 })).to.be.rejectedWith(
        RangeError,
        'target buffer'
      );
      assert.strictEqual(source.position, 0);
    } finally {
      await source.close();
    }
  });

  it('verifies exact remainder bytes even when a file was truncated after opening', async () => {
    const filePath = path.join(directory, 'truncated.bin');
    await writeFile(filePath, bytes);
    const source = await fromFile(filePath);
    try {
      const view = createTokenizerView(source, 16);
      await truncate(filePath, 3);
      assert.strictEqual(source.fileInfo.size, 16, 'cached size deliberately exceeds actual bytes');
      await expect(view.consumeRemainder()).to.be.rejectedWith(EndOfStreamError);
      assert.strictEqual(source.position, 0);
    } finally {
      await source.close();
    }
  });

  it('rejects overlapping parent/child operations and close during an active read', async () => {
    const source = fromBuffer(bytes);
    let finish: (count: number) => void = () => assert.fail('read has not started');
    source.readBuffer = async () =>
      new Promise<number>(resolve => {
        finish = resolve;
      });
    const parent = createTokenizerView(source, 8);
    const child = parent.createView(4);
    const pending = child.readBuffer(new Uint8Array(1));
    await expect(parent.readNumber(UINT8)).to.be.rejectedWith('sequential');
    await expect(child.peekNumber(UINT8)).to.be.rejectedWith('sequential');
    await expect(parent.close()).to.be.rejectedWith('active operation');
    await expect(child.close()).to.be.rejectedWith('active operation');
    assert.throws(() => parent.createView(1), /sequential/);
    finish(1);
    assert.strictEqual(await pending, 1);
    await child.close();
    await parent.close();
  });

  it('keeps close local but propagates explicit abort to the shared source', async () => {
    const source = fromBuffer(bytes);
    let aborted = false;
    source.abort = async () => {
      aborted = true;
    };
    const view = createTokenizerView(source, 8);
    await view.close();
    assert.isFalse(aborted);
    const next = createTokenizerView(source, 8);
    await next.abort();
    assert.isTrue(aborted);
    await expect(next.readNumber(UINT8)).to.be.rejectedWith('closed');
  });

  it('keeps a child unusable after its parent view closes', async () => {
    const parent = createTokenizerView(fromBuffer(bytes), 8);
    const child = parent.createView(4);
    await parent.close();
    await expect(child.readNumber(UINT8)).to.be.rejectedWith('closed');
    assert.throws(() => createTokenizerView(parent, 0), /closed/);
    await child.close();
  });
});
