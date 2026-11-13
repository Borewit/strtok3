import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs, { type FileHandle } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import process from 'node:process';
import * as Token from 'token-types';
import {
  AbortError,
  BufferSizeError,
  EndOfStreamError,
  fromFile,
  type IFromFileOptions,
  NotRegularFileError
} from '../lib/index.js';

const originalOpen = fs.open;
const payload = Uint8Array.from({ length: 32 }, (_, index) => index);
const posixIt = process.platform === 'win32' ? it.skip : it;
let directory: string;
let filePath: string;
let openedHandles: FileHandle[];

function captureOpenedHandles(afterOpen?: (handle: FileHandle) => void) {
  fs.open = async (...args) => {
    const handle = await originalOpen(...args);
    openedHandles.push(handle);
    afterOpen?.(handle);
    return handle;
  };
}

async function assertHandleClosed() {
  assert.equal(openedHandles.length, 1);
  const [handle] = openedHandles;
  assert.equal(handle.fd, -1);
  await assert.rejects(handle.read(new Uint8Array(1), 0, 1, 0), { code: 'EBADF' });
}

describe('Regular-file-only factory', () => {
  before(async () => {
    directory = await fs.mkdtemp(path.join(tmpdir(), 'strtok3-regular-file-'));
    filePath = path.join(directory, 'sample.bin');
    await fs.writeFile(filePath, payload);
  });

  beforeEach(() => {
    openedHandles = [];
  });

  afterEach(async () => {
    fs.open = originalOpen;
    for (const handle of openedHandles) {
      await handle.close();
    }
  });

  after(async () => {
    await fs.rm(directory, { recursive: true, force: true });
  });

  for (const regularFileOnly of [undefined, false, true]) {
    it(`reads regular files and preserves tokenizer options (regularFileOnly ${regularFileOnly})`, async () => {
      let closed = false;
      const options: IFromFileOptions = {
        regularFileOnly,
        maxBufferSize: 16,
        fileInfo: { size: 0, mimeType: 'application/octet-stream' },
        onClose: async () => {
          closed = true;
        }
      };
      const tokenizer = await fromFile(filePath, options);
      try {
        assert.equal(tokenizer.fileInfo.path, filePath);
        assert.equal(tokenizer.fileInfo.size, payload.length);
        assert.equal(tokenizer.fileInfo.mimeType, options.fileInfo?.mimeType);
        assert.deepEqual(await tokenizer.readToken(new Token.Uint8ArrayType(16)), payload.subarray(0, 16));
        await assert.rejects(tokenizer.peekToken(new Token.Uint8ArrayType(17)), BufferSizeError);
      } finally {
        await tokenizer.close();
      }
      assert.equal(closed, true);
    });
  }

  for (const failure of [false, true]) {
    it(`closes the file handle only once and preserves the first result (failure=${failure})`, async () => {
      let closeCalls = 0;
      let callbackCalls = 0;
      const error = new Error('file close failed');
      let restore = () => undefined;
      captureOpenedHandles(handle => {
        const close = handle.close.bind(handle);
        restore = () => {
          handle.close = close;
        };
        handle.close = async () => {
          closeCalls++;
          await close();
          if (failure) {
            throw error;
          }
        };
      });
      const tokenizer = await fromFile(filePath, {
        onClose: async () => {
          callbackCalls++;
          assert.equal(openedHandles[0].fd, -1, 'file must close before onClose');
        }
      });
      try {
        const results = await Promise.allSettled([tokenizer.close(), tokenizer.close()]);
        for (const result of results) {
          if (failure) {
            assert.equal(result.status, 'rejected');
            if (result.status === 'rejected') {
              assert.equal(result.reason, error);
            }
          } else {
            assert.equal(result.status, 'fulfilled');
          }
        }
        if (failure) {
          await assert.rejects(tokenizer.close(), caught => caught === error);
        } else {
          await tokenizer.close();
        }
        assert.equal(closeCalls, 1);
        assert.equal(callbackCalls, failure ? 0 : 1);
      } finally {
        restore();
        await tokenizer.close().catch(() => undefined);
      }
    });
  }

  posixIt('rejects an opened directory with a recognizable error and closes its handle', async () => {
    captureOpenedHandles();
    await assert.rejects(fromFile(directory, { regularFileOnly: true }), error => {
      assert.ok(error instanceof NotRegularFileError);
      assert.equal(error.name, 'NotRegularFileError');
      assert.equal(error.path, directory);
      return true;
    });
    await assertHandleClosed();
  });

  for (const regularFileOnly of [undefined, false]) {
    posixIt(`preserves opening non-regular files when not enabled (regularFileOnly ${regularFileOnly})`, async () => {
      const tokenizer = await fromFile(directory, { regularFileOnly });
      await tokenizer.close();
    });
  }

  posixIt('accepts a symbolic link to a regular file', async () => {
    const linkPath = path.join(directory, 'link.bin');
    await fs.symlink(filePath, linkPath);
    const tokenizer = await fromFile(linkPath, { regularFileOnly: true });
    try {
      assert.deepEqual(await tokenizer.readToken(new Token.Uint8ArrayType(payload.length)), payload);
    } finally {
      await tokenizer.close();
    }
  });

  it('propagates opening errors', async () => {
    await assert.rejects(fromFile(path.join(directory, 'missing.bin'), { regularFileOnly: true }), { code: 'ENOENT' });
  });

  it('validates options and already-aborted signals before opening', async () => {
    captureOpenedHandles();
    const abortController = new AbortController();
    abortController.abort();
    await assert.rejects(fromFile(filePath, { regularFileOnly: true, maxBufferSize: 0 }), RangeError);
    await assert.rejects(
      fromFile(filePath, { regularFileOnly: true, abortSignal: abortController.signal }),
      AbortError
    );
    assert.equal(openedHandles.length, 0);
  });

  for (const stage of ['open', 'stat']) {
    it(`closes its handle when aborted during ${stage}`, async () => {
      const abortController = new AbortController();
      captureOpenedHandles(handle => {
        if (stage === 'open') {
          abortController.abort();
        } else {
          const originalStat = handle.stat.bind(handle);
          handle.stat = (async (...args: Parameters<FileHandle['stat']>) => {
            const stat = await originalStat(...args);
            abortController.abort();
            return stat;
          }) as FileHandle['stat'];
        }
      });
      await assert.rejects(
        fromFile(filePath, { regularFileOnly: true, abortSignal: abortController.signal }),
        AbortError
      );
      await assertHandleClosed();
    });
  }

  it('closes its handle and preserves a stat failure', async () => {
    const statError = new Error('Stat failed');
    captureOpenedHandles(handle => {
      handle.stat = async () => {
        throw statError;
      };
    });
    await assert.rejects(fromFile(filePath, { regularFileOnly: true }), error => error === statError);
    await assertHandleClosed();
  });

  for (const replaceBeforeOpen of [false, true]) {
    posixIt(
      `rejects a FIFO without waiting for a writer (path replaced before open: ${replaceBeforeOpen})`,
      async () => {
        const fifoPath = path.join(directory, `input-${replaceBeforeOpen}.fifo`);
        if (replaceBeforeOpen) {
          await fs.writeFile(fifoPath, payload);
        } else {
          const result = spawnSync('mkfifo', [fifoPath], { encoding: 'utf8' });
          assert.equal(result.status, 0, result.stderr);
        }

        // A subprocess timeout makes a blocking-open regression fail without hanging the test runner.
        const script = `
        import assert from 'node:assert/strict';
        import {spawnSync} from 'node:child_process';
        import fs from 'node:fs/promises';
        import {fromFile, NotRegularFileError} from ${JSON.stringify(new URL('../lib/index.js', import.meta.url).href)};
        const fifoPath = ${JSON.stringify(fifoPath)};
        const originalOpen = fs.open;
        let handle;
        fs.open = async (...args) => {
          if (${replaceBeforeOpen}) {
            await fs.unlink(fifoPath);
            const result = spawnSync('mkfifo', [fifoPath], {encoding: 'utf8'});
            assert.equal(result.status, 0, result.stderr);
          }
          handle = await originalOpen(...args);
          return handle;
        };
        try {
          await assert.rejects(fromFile(fifoPath, {regularFileOnly: true}), NotRegularFileError);
          assert.equal(handle.fd, -1);
          await assert.rejects(handle.read(new Uint8Array(1), 0, 1, 0), {code: 'EBADF'});
          console.log('rejected and closed');
        } finally {
          fs.open = originalOpen;
          await handle?.close();
        }
      `;
        const result = spawnSync(process.execPath, ['--input-type=module', '-e', script], {
          encoding: 'utf8',
          timeout: 1500,
          killSignal: 'SIGKILL'
        });
        assert.equal(result.signal, null);
        assert.equal(result.status, 0, result.stderr);
        assert.equal(result.stdout.trim(), 'rejected and closed');
      }
    ).timeout(5000);
  }

  describe('Partial file reads', () => {
    function capturePartialReads(beforeRead?: (call: number, handle: FileHandle) => Promise<void> | void) {
      const calls: number[][] = [];
      captureOpenedHandles(handle => {
        const read = handle.read.bind(handle);
        handle.read = (async (buffer: Uint8Array, offset: number, length: number, position: number) => {
          calls.push([offset, length, position]);
          await beforeRead?.(calls.length, handle);
          return read(buffer, offset, Math.min(length, 2), position);
        }) as FileHandle['read'];
      });
      return calls;
    }

    for (const method of ['readToken', 'peekToken', 'readNumber', 'peekNumber'] as const) {
      const advancesPosition = method === 'readToken' || method === 'readNumber';

      function trackedToken() {
        let decodeCalls = 0;
        return {
          token: {
            len: Token.UINT32_BE.len,
            get(buffer: Uint8Array, offset: number) {
              decodeCalls++;
              return Token.UINT32_BE.get(buffer, offset);
            },
            put: Token.UINT32_BE.put.bind(Token.UINT32_BE)
          },
          get decodeCalls() {
            return decodeCalls;
          }
        };
      }

      it(`${method} inherits exact short-read filling without decoder retries`, async () => {
        const calls = capturePartialReads();
        const tokenizer = await fromFile(filePath);
        const tracked = trackedToken();
        try {
          tokenizer.setPosition(3);
          assert.equal(await tokenizer[method](tracked.token), Token.UINT32_BE.get(payload, 3));
          assert.equal(tracked.decodeCalls, 1);
          assert.deepEqual(calls, [
            [0, 4, 3],
            [2, 2, 5]
          ]);
          assert.equal(tokenizer.position, advancesPosition ? 7 : 3);

          // Reuse the same token and numeric scratch buffer on the next operation.
          const nextPosition = tokenizer.position;
          assert.equal(await tokenizer[method](tracked.token), Token.UINT32_BE.get(payload, nextPosition));
          assert.equal(tracked.decodeCalls, 2);
          assert.deepEqual(calls.slice(2), [
            [0, 4, nextPosition],
            [2, 2, nextPosition + 2]
          ]);
          assert.equal(tokenizer.position, advancesPosition ? 11 : 3);
        } finally {
          await tokenizer.close();
        }
      });

      it(`${method} does not decode failed reads and resumes from preserved progress`, async () => {
        const error = new Error('file read failed');
        const calls = capturePartialReads(call => {
          if (call === 2) {
            throw error;
          }
        });
        const tokenizer = await fromFile(filePath);
        const tracked = trackedToken();
        try {
          tokenizer.setPosition(3);
          await assert.rejects(tokenizer[method](tracked.token), caught => caught === error);
          assert.equal(tracked.decodeCalls, 0);
          assert.equal(tokenizer.position, advancesPosition ? 5 : 3);
          assert.deepEqual(calls, [
            [0, 4, 3],
            [2, 2, 5]
          ]);

          const nextPosition = tokenizer.position;
          assert.equal(await tokenizer[method](tracked.token), Token.UINT32_BE.get(payload, nextPosition));
          assert.equal(tracked.decodeCalls, 1);
          assert.deepEqual(calls.slice(2), [
            [0, 4, nextPosition],
            [2, 2, nextPosition + 2]
          ]);
          assert.equal(tokenizer.position, advancesPosition ? 9 : 3);
        } finally {
          await tokenizer.close();
        }
      });

      it(`${method} respects physical EOF after truncation without decoding partial bytes`, async () => {
        const truncatedPath = path.join(directory, `truncated-${method}.bin`);
        await fs.writeFile(truncatedPath, payload);
        const calls = capturePartialReads();
        const tokenizer = await fromFile(truncatedPath);
        const tracked = trackedToken();
        try {
          assert.equal(tokenizer.fileInfo.size, payload.length);
          await fs.truncate(truncatedPath, 3);
          await assert.rejects(tokenizer[method](tracked.token), EndOfStreamError);
          assert.equal(tracked.decodeCalls, 0);
          assert.deepEqual(calls, [
            [0, 4, 0],
            [2, 2, 2],
            [3, 1, 3]
          ]);
          assert.equal(tokenizer.position, advancesPosition ? 3 : 0);
        } finally {
          await tokenizer.close();
        }
      });
    }

    for (const method of ['readBuffer', 'peekBuffer'] as const) {
      for (const mayBeLess of [undefined, false]) {
        it(`${method} fills exact requests across short reads (mayBeLess ${mayBeLess})`, async () => {
          const calls = capturePartialReads();
          const tokenizer = await fromFile(filePath);
          try {
            tokenizer.setPosition(9);
            const backing = new Uint8Array(10).fill(255);
            const destination = backing.subarray(2, 8);
            assert.equal(await tokenizer[method](destination, { position: 3, length: 5, mayBeLess }), 5);
            assert.deepEqual(backing, Uint8Array.of(255, 255, 3, 4, 5, 6, 7, 255, 255, 255));
            assert.deepEqual(calls, [
              [0, 5, 3],
              [2, 3, 5],
              [4, 1, 7]
            ]);
            assert.equal(tokenizer.position, method === 'readBuffer' ? 8 : 9);
          } finally {
            await tokenizer.close();
          }
        });
      }

      it(`${method} retries when options are omitted`, async () => {
        const calls = capturePartialReads();
        const tokenizer = await fromFile(filePath);
        try {
          tokenizer.setPosition(4);
          const destination = new Uint8Array(4);
          assert.equal(await tokenizer[method](destination), 4);
          assert.deepEqual(destination, payload.subarray(4, 8));
          assert.deepEqual(calls, [
            [0, 4, 4],
            [2, 2, 6]
          ]);
          assert.equal(tokenizer.position, method === 'readBuffer' ? 8 : 4);
        } finally {
          await tokenizer.close();
        }
      });

      it(`${method} returns after one short read with mayBeLess`, async () => {
        const calls = capturePartialReads();
        const tokenizer = await fromFile(filePath);
        try {
          const destination = new Uint8Array(5).fill(255);
          assert.equal(await tokenizer[method](destination, { position: 3, mayBeLess: true }), 2);
          assert.deepEqual(destination, Uint8Array.of(3, 4, 255, 255, 255));
          assert.deepEqual(calls, [[0, 5, 3]]);
          assert.equal(tokenizer.position, method === 'readBuffer' ? 5 : 0);
        } finally {
          await tokenizer.close();
        }
      });

      it(`${method} throws only after zero-byte EOF and preserves partial progress`, async () => {
        const calls = capturePartialReads();
        const tokenizer = await fromFile(filePath);
        try {
          tokenizer.setPosition(7);
          const destination = new Uint8Array(6).fill(255);
          await assert.rejects(tokenizer[method](destination, { position: 29 }), EndOfStreamError);
          assert.deepEqual(destination, Uint8Array.of(29, 30, 31, 255, 255, 255));
          assert.deepEqual(calls, [
            [0, 6, 29],
            [2, 4, 31],
            [3, 3, 32]
          ]);
          assert.equal(tokenizer.position, method === 'readBuffer' ? 32 : 7);
        } finally {
          await tokenizer.close();
        }
      });

      for (const mayBeLess of [false, true]) {
        it(`${method} stops immediately at EOF (mayBeLess ${mayBeLess})`, async () => {
          const calls = capturePartialReads();
          const tokenizer = await fromFile(filePath);
          try {
            const destination = new Uint8Array(3).fill(255);
            const operation = tokenizer[method](destination, { position: 40, mayBeLess });
            if (mayBeLess) {
              assert.equal(await operation, 0);
            } else {
              await assert.rejects(operation, EndOfStreamError);
            }
            assert.deepEqual(destination, Uint8Array.of(255, 255, 255));
            assert.deepEqual(calls, [[0, 3, 40]]);
            assert.equal(tokenizer.position, method === 'readBuffer' ? 40 : 0);
          } finally {
            await tokenizer.close();
          }
        });

        it(`${method} does not issue reads for zero length (mayBeLess ${mayBeLess})`, async () => {
          const calls = capturePartialReads();
          const tokenizer = await fromFile(filePath);
          try {
            const destination = new Uint8Array(3).fill(255);
            assert.equal(await tokenizer[method](destination, { position: 40, length: 0, mayBeLess }), 0);
            assert.deepEqual(destination, Uint8Array.of(255, 255, 255));
            assert.equal(calls.length, 0);
            assert.equal(tokenizer.position, method === 'readBuffer' ? 40 : 0);
          } finally {
            await tokenizer.close();
          }
        });
      }

      for (const error of [new Error('file read failed'), new AbortError()]) {
        it(`${method} propagates ${error.name} after partial progress`, async () => {
          const calls = capturePartialReads(call => {
            if (call === 2) {
              throw error;
            }
          });
          const tokenizer = await fromFile(filePath);
          try {
            tokenizer.setPosition(9);
            const destination = new Uint8Array(5).fill(255);
            await assert.rejects(tokenizer[method](destination, { position: 3 }), caught => caught === error);
            assert.deepEqual(destination, Uint8Array.of(3, 4, 255, 255, 255));
            assert.deepEqual(calls, [
              [0, 5, 3],
              [2, 3, 5]
            ]);
            assert.equal(tokenizer.position, method === 'readBuffer' ? 5 : 9);
          } finally {
            await tokenizer.close();
          }
        });
      }

      it(`${method} propagates a handle closed between short reads`, async () => {
        const calls = capturePartialReads(async (call, handle) => {
          if (call === 2) {
            await handle.close();
          }
        });
        const tokenizer = await fromFile(filePath);
        try {
          const destination = new Uint8Array(5).fill(255);
          await assert.rejects(tokenizer[method](destination, { position: 3 }), { code: 'EBADF' });
          assert.deepEqual(destination, Uint8Array.of(3, 4, 255, 255, 255));
          assert.equal(calls.length, 2);
          assert.equal(tokenizer.position, method === 'readBuffer' ? 5 : 0);
        } finally {
          await tokenizer.close();
        }
      });
    }
  });
});
