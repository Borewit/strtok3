import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs, { type FileHandle } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import process from 'node:process';
import * as Token from 'token-types';
import { AbortError, BufferSizeError, fromFile, type IFromFileOptions, NotRegularFileError } from '../lib/index.js';

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
});
