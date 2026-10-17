import { Readable } from 'node:stream';
import { fileURLToPath } from 'node:url';
import { assert } from 'chai';
import { isRandomAccessTokenizer as coreGuard, fromStream } from '../lib/core.js';
import { fromBlob, fromBuffer, fromFile, type ITokenizer, isRandomAccessTokenizer } from '../lib/index.js';

describe('isRandomAccessTokenizer', () => {
  it('is exported from the main and core entry points', () => {
    assert.strictEqual(isRandomAccessTokenizer, coreGuard);
  });

  const factories: Record<string, () => Promise<ITokenizer>> = {
    buffer: async () => fromBuffer(new Uint8Array([1, 2, 3])),
    blob: async () => fromBlob(new Blob([new Uint8Array([1, 2, 3])])),
    file: () => fromFile(fileURLToPath(new URL('resources/test1.dat', import.meta.url)))
  };

  for (const [name, factory] of Object.entries(factories)) {
    it(`narrows a ${name} tokenizer to position control and a known size`, async () => {
      const tokenizer = await factory();
      try {
        if (!isRandomAccessTokenizer(tokenizer)) {
          assert.fail('Expected a random-access tokenizer');
        }
        const size: number = tokenizer.fileInfo.size;
        tokenizer.setPosition(size);
        assert.strictEqual(tokenizer.position, size);
        tokenizer.setPosition(0);
        assert.strictEqual(tokenizer.position, 0);
        assert.strictEqual(await tokenizer.readBuffer(new Uint8Array(1)), 1);
      } finally {
        await tokenizer.close();
      }
    });
  }

  for (const size of [undefined, 0, 3]) {
    it(`rejects a forward-only stream with size=${size}`, async () => {
      const tokenizer = fromStream(Readable.from([new Uint8Array([1, 2, 3])]), { fileInfo: { size } });
      try {
        assert.isFalse(isRandomAccessTokenizer(tokenizer));
      } finally {
        await tokenizer.close();
      }
    });
  }

  it('rejects random reads without position control on a third-party tokenizer', async () => {
    const tokenizer: ITokenizer = fromStream(Readable.from([]), { fileInfo: { size: 0 } });
    tokenizer.supportsRandomAccess = () => true;
    try {
      assert.isFalse(isRandomAccessTokenizer(tokenizer));
    } finally {
      await tokenizer.close();
    }
  });

  it('rejects non-callable position control', () => {
    const tokenizer = fromBuffer(new Uint8Array());
    Object.defineProperty(tokenizer, 'setPosition', { value: 0 });
    assert.isFalse(isRandomAccessTokenizer(tokenizer));
  });

  it('rejects random access without a known size', () => {
    const tokenizer: ITokenizer = fromBuffer(new Uint8Array());
    delete tokenizer.fileInfo.size;
    assert.isFalse(isRandomAccessTokenizer(tokenizer));
  });

  it('accepts an empty random-access input', () => {
    assert.isTrue(isRandomAccessTokenizer(fromBuffer(new Uint8Array())));
  });
});
