import nodeAssert from 'node:assert/strict';
import { getEventListeners } from 'node:events';
import { Readable } from 'node:stream';
import { fileURLToPath } from 'node:url';
import { assert } from 'chai';
import { UINT8 } from 'token-types';
import {
  fromBlob,
  fromBuffer,
  fromStream,
  fromWebStream,
  type ITokenizer,
  type ITokenizerOptions
} from '../lib/core.js';
import { fromFile } from '../lib/index.js';

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

describe('Single-shot tokenizer close', () => {
  const closeFactories: {
    name: string;
    make: (options: ITokenizerOptions) => ITokenizer | Promise<ITokenizer>;
  }[] = [
    { name: 'buffer', make: options => fromBuffer(Uint8Array.of(42), options) },
    { name: 'Blob', make: options => fromBlob(new Blob([Uint8Array.of(42)]), options) },
    { name: 'file', make: options => fromFile(fileURLToPath(new URL('resources/test3.dat', import.meta.url)), options) }
  ];

  for (const factory of closeFactories) {
    describe(factory.name, () => {
      for (const abortFirst of [false, true]) {
        it(`invokes onClose once after repeated closes (abort first=${abortFirst})`, async () => {
          let calls = 0;
          const controller = new AbortController();
          const tokenizer = await factory.make(
            Object.freeze({
              abortSignal: controller.signal,
              onClose: async () => {
                calls++;
              }
            })
          );
          try {
            if (abortFirst) {
              await tokenizer.abort();
            }
            const first = tokenizer.close();
            assert.strictEqual(getEventListeners(controller.signal, 'abort').length, 0);
            await first;
            await tokenizer.close();
            await tokenizer.close();
            assert.strictEqual(calls, 1);
          } finally {
            await tokenizer.close();
          }
        });
      }

      it('shares pending callback completion between concurrent closes', async () => {
        let calls = 0;
        let release: () => void = () => undefined;
        let started: () => void = () => undefined;
        const pending = new Promise<void>(resolve => {
          release = resolve;
        });
        const entered = new Promise<void>(resolve => {
          started = resolve;
        });
        const tokenizer = await factory.make({
          onClose: async () => {
            calls++;
            started();
            await pending;
          }
        });
        const first = tokenizer.close();
        const second = tokenizer.close();
        try {
          await entered;
          // Let any duplicate callback invocation enter before releasing the first.
          await new Promise<void>(resolve => setImmediate(resolve));
          assert.strictEqual(calls, 1);
        } finally {
          release();
          await Promise.all([first, second]);
          await tokenizer.close();
        }
        assert.strictEqual(calls, 1);
      });

      for (const synchronous of [false, true]) {
        it(`preserves the first callback error for concurrent and later closes (sync=${synchronous})`, async () => {
          const error = new Error('onClose failed');
          let calls = 0;
          const tokenizer = await factory.make({
            onClose: () => {
              calls++;
              if (synchronous) {
                throw error;
              }
              return Promise.reject(error);
            }
          });
          const results = await Promise.allSettled([tokenizer.close(), tokenizer.close()]);
          for (const result of results) {
            nodeAssert.equal(result.status, 'rejected');
            if (result.status === 'rejected') {
              nodeAssert.equal(result.reason, error);
            }
          }
          await nodeAssert.rejects(tokenizer.close(), caught => caught === error);
          assert.strictEqual(calls, 1);
        });
      }
    });
  }
});

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
