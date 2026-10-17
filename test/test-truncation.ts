import { Readable } from 'node:stream';
import { assert, expect, use } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { UINT8, Uint8ArrayType } from 'token-types';
import { EndOfStreamError, fromBuffer, fromStream, fromWebStream } from '../lib/index.js';
import type { ITokenizer } from '../lib/types.js';

use(chaiAsPromised);

const payload = Uint8Array.of(1, 2, 3);
const factories: { name: string; make: () => ITokenizer | Promise<ITokenizer> }[] = [
  { name: 'Node', make: () => fromStream(Readable.from([payload], { objectMode: false })) },
  {
    name: 'web',
    make: () =>
      fromWebStream(
        new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(payload);
            controller.close();
          }
        })
      )
  }
];

for (const { name, make } of factories) {
  describe(`Truncated exact ${name} stream operations`, () => {
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

describe('Buffer peeks past underlying EOF', () => {
  it('returns zero for mayBeLess peeks beyond EOF instead of a negative count', async () => {
    const source = fromBuffer(payload);
    assert.strictEqual(await source.peekBuffer(new Uint8Array(1), { position: 5, mayBeLess: true }), 0);
    assert.strictEqual(source.position, 0);
    await expect(source.peekBuffer(new Uint8Array(1), { position: 5 })).to.be.rejectedWith(EndOfStreamError);
    assert.strictEqual(await source.readNumber(UINT8), 1);
  });
});
