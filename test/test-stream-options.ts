import { Readable } from 'node:stream';
import { assert } from 'chai';
import { UINT8 } from 'token-types';
import { fromBuffer, fromStream, fromWebStream, type ITokenizer, type ITokenizerOptions } from '../lib/core.js';

const factories: { name: string; make: (options: ITokenizerOptions) => ITokenizer }[] = [
  {
    name: 'Node stream',
    make: options => fromStream(Readable.from([Uint8Array.from([1, 2, 3])], { objectMode: false }), options)
  },
  {
    name: 'default web stream',
    make: options =>
      fromWebStream(
        new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(Uint8Array.from([1, 2, 3]));
            controller.close();
          }
        }),
        options
      )
  },
  {
    name: 'BYOB web stream',
    make: options =>
      fromWebStream(
        new ReadableStream<Uint8Array>({
          type: 'bytes',
          start(controller) {
            controller.enqueue(Uint8Array.from([1, 2, 3]));
            controller.close();
          }
        }),
        options
      )
  }
];

describe('Stream tokenizer options ownership', () => {
  for (const factory of factories) {
    describe(factory.name, () => {
      for (const withCallback of [false, true]) {
        it(`accepts frozen options ${withCallback ? 'with' : 'without'} an onClose callback`, async () => {
          let closed = 0;
          const options = Object.freeze({
            maxBufferSize: 16,
            ...(withCallback
              ? {
                  onClose: async () => {
                    closed++;
                  }
                }
              : {})
          });
          const tokenizer = factory.make(options);
          try {
            assert.strictEqual(await tokenizer.readNumber(UINT8), 1);
          } finally {
            await tokenizer.close();
          }
          // onClose is documented for buffer/blob/file tokenizers, not streams.
          assert.strictEqual(closed, 0);
        });
      }

      it('does not add properties to caller-owned options', async () => {
        const options = { maxBufferSize: 16 };
        const tokenizer = factory.make(options);
        try {
          assert.deepEqual(options, { maxBufferSize: 16 });
        } finally {
          await tokenizer.close();
        }
      });

      it('preserves the identity of the caller-provided onClose callback', async () => {
        const onClose = async () => undefined;
        const options = { onClose };
        const tokenizer = factory.make(options);
        try {
          assert.strictEqual(options.onClose, onClose);
        } finally {
          await tokenizer.close();
        }
      });

      it('does not let closing a buffer tokenizer sharing the options close this stream', async () => {
        let closed = 0;
        const onClose = async () => {
          closed++;
        };
        const options = { onClose };
        const streamTokenizer = factory.make(options);
        try {
          assert.strictEqual(await streamTokenizer.readNumber(UINT8), 1);
          const bufferTokenizer = fromBuffer(Uint8Array.from([42]), options);
          await bufferTokenizer.close();
          assert.strictEqual(closed, 1);
          assert.strictEqual(await streamTokenizer.readNumber(UINT8), 2);
        } finally {
          await streamTokenizer.close();
        }
        assert.strictEqual(closed, 1);
      });
    });
  }
});
