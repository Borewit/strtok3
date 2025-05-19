import { PassThrough } from 'node:stream';
import * as fs from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import * as Token from 'token-types';
import { assert, expect, use } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {
  fromBuffer,
  fromFile,
  fromStream,
  fromWebStream,
  type ITokenizer,
  type IRandomAccessTokenizer
} from '../lib/index.js';
import Path from 'node:path';
import { EndOfStreamError } from 'peek-readable';

import mocha from 'mocha';
import { stringToUint8Array } from 'uint8array-extras';

import { DelayedStream, makeByteReadableStreamFromFile } from './util.js';
import process from 'node:process';

use(chaiAsPromised);

const __dirname = dirname(fileURLToPath(import .meta.url));

const {describe, it} = mocha;

interface ITokenizerTest {
  name: string;
  loadTokenizer: (testFile: string, delay?: number, abortSignal?: AbortSignal) => Promise<ITokenizer>;
  hasFileInfo: boolean;
  abortable: boolean;
  randomRead: boolean;
}

function getResourcePath(testFile: string) {
  return Path.join(__dirname, 'resources', testFile);
}

async function getTokenizerWithData(testData: string, test: ITokenizerTest, delay?: number, abortSignal?: AbortSignal): Promise<ITokenizer> {
  const testPath = getResourcePath('tmp.dat');
  await fs.writeFile(testPath, testData, {encoding: 'latin1'});
  return test.loadTokenizer('tmp.dat', delay, abortSignal);
}

describe('Matrix tests', () => {

  const tokenizerTests: ITokenizerTest[] = [
    {
      name: 'fromStream()',
      loadTokenizer: async (testFile, delay, abortSignal?: AbortSignal) => {
        const stream = createReadStream(getResourcePath(testFile));
        const delayedStream = new DelayedStream(stream, delay);
        return fromStream(delayedStream, {abortSignal});
      },
      hasFileInfo: true,
      abortable: true,
      randomRead: false
    }, {
      name: 'fromWebStream()',
      loadTokenizer: async (testFile, delay, abortSignal?: AbortSignal) => {
        const fileStream = makeByteReadableStreamFromFile(Path.join(__dirname, 'resources', testFile), delay);
        return fromWebStream(fileStream, {abortSignal});
      },
      hasFileInfo: false,
      abortable: true,
      randomRead: false
    }, {
      name: 'fromFile()',
      loadTokenizer: async testFile => {
        return fromFile(Path.join(__dirname, 'resources', testFile));
      },
      hasFileInfo: true,
      abortable: false,
      randomRead: true
    }, {
      name: 'fromBuffer()',
      loadTokenizer: async testFile => {
        const data = await fs.readFile(Path.join(__dirname, 'resources', testFile));
        return fromBuffer(data);
      },
      hasFileInfo: true,
      abortable: false,
      randomRead: true
    }
  ];

  tokenizerTests
    // .filter((x, n) => n === 1)
    .forEach(tokenizerType => {
      describe(tokenizerType.name, () => {

        describe('tokenizer read options', () => {

          it('option.offset', async () => {
            const buf = new Uint8Array(7);
            const rst = await getTokenizerWithData('\x01\x02\x03\x04\x05\x06', tokenizerType);
            assert.strictEqual(await rst.readBuffer(buf.subarray(1), {length: 6}), 6);
            await rst.close();
          });

          it('option.length', async () => {
            const buf = new Uint8Array(7);
            const rst = await getTokenizerWithData('\x01\x02\x03\x04\x05\x06', tokenizerType);
            assert.strictEqual(await rst.readBuffer(buf, {length: 2}), 2);
            await rst.close();
          });

          it('default length', async () => {
            const buf = new Uint8Array(6);
            const rst = await getTokenizerWithData('\x01\x02\x03\x04\x05\x06', tokenizerType);
            assert.strictEqual(await rst.readBuffer(buf.subarray(1)), 5, 'default length = buffer.length - option.offset');
            await rst.close();
          });

          it('option.maybeLess = true', async () => {
            const buffer = new Uint8Array(4);
            const rst = await getTokenizerWithData('\x89\x54\x40', tokenizerType);
            const len = await rst.readBuffer(buffer, {mayBeLess: true});
            assert.strictEqual(len, 3, 'should return 3 because no more bytes are available');
            await rst.close();
          });

          it('option.position', async () => {
            const buffer = new Uint8Array(5);
            const rst = await getTokenizerWithData('\x01\x02\x03\x04\x05\x06', tokenizerType);
            const len = await rst.readBuffer(buffer, {position: 1});
            assert.strictEqual(len, 5, 'return value');
            assert.deepEqual(buffer, Uint8Array.from([0x02, 0x03, 0x04, 0x05, 0x06]));
            await rst.close();
          });

        });

        describe('tokenizer peek options', () => {

          it('option.offset', async () => {
            const buf = new Uint8Array(7);
            const rst = await getTokenizerWithData('\x01\x02\x03\x04\x05\x06', tokenizerType);
            assert.strictEqual(await rst.peekBuffer(buf.subarray(1), {length: 6}), 6);
            await rst.close();
          });

          it('option.length', async () => {
            const buf = new Uint8Array(7);
            const rst = await getTokenizerWithData('\x01\x02\x03\x04\x05\x06', tokenizerType);
            assert.strictEqual(await rst.peekBuffer(buf, {length: 2}), 2);
            await rst.close();
          });

          it('default length', async () => {
            const buf = new Uint8Array(6);
            const rst = await getTokenizerWithData('\x01\x02\x03\x04\x05\x06', tokenizerType);
            assert.strictEqual(await rst.peekBuffer(buf.subarray(1)), 5, 'default length = buffer.length - option.offset');
            await rst.close();
          });

          it('option.maybeLess = true', async () => {
            const buffer = new Uint8Array(4);
            const rst = await getTokenizerWithData('\x89\x54\x40', tokenizerType);
            const len = await rst.peekBuffer(buffer, {mayBeLess: true});
            assert.strictEqual(len, 3, 'should return 3 because no more bytes are available');
            await rst.close();
          });

          it('option.position', async () => {
            const buffer = new Uint8Array(5);
            const rst = await getTokenizerWithData('\x01\x02\x03\x04\x05\x06', tokenizerType);
            const len = await rst.peekBuffer(buffer, {position: 1});
            assert.strictEqual(len, 5, 'return value');
            assert.deepEqual(buffer, Uint8Array.from([0x02, 0x03, 0x04, 0x05, 0x06]));
            await rst.close();
          });

        });

        it('should decode buffer', async () => {

          const rst = await getTokenizerWithData('\x05peter', tokenizerType);
          // should decode UINT8 from chunk
          assert.strictEqual(rst.position, 0);
          let value: string | number = await rst.readToken(Token.UINT8);
          assert.strictEqual(typeof value, 'number');
          assert.strictEqual(value, 5, '0x05 == 5');
          // should decode string from chunk
          assert.strictEqual(rst.position, 1);
          value = await rst.readToken(new Token.StringType(5, 'utf-8'));
          assert.strictEqual(typeof value, 'string');
          assert.strictEqual(value, 'peter');
          assert.strictEqual(rst.position, 6);
          // should should reject at the end of the stream
          try {
            await rst.readToken(Token.UINT8);
            assert.fail('Should reject due to end-of-stream');
          } catch (err) {
            assert.instanceOf(err, EndOfStreamError);
          } finally {
            await rst.close();
          }
        });

        it('should be able to read from an absolute offset', async () => {

          const rst = await getTokenizerWithData('\x05peter', tokenizerType);
          // should decode UINT8 from chunk
          assert.strictEqual(rst.position, 0);
          const value: string | number = await rst.readToken(new Token.StringType(5, 'utf-8'), 1);
          assert.strictEqual(typeof value, 'string');
          assert.strictEqual(value, 'peter');
          assert.strictEqual(rst.position, 6);

          try {
            await rst.readToken(Token.UINT8);
            assert.fail('Should reject due to end-of-stream');
          } catch (err) {
            assert.instanceOf(err, EndOfStreamError);
          } finally {
            await rst.close();
          }

        });

        it('should pick length from buffer, if length is not explicit defined', async () => {

          const rst = await getTokenizerWithData('\x05peter', tokenizerType);

          const buf = new Uint8Array(4);

          // should decode UINT8 from chunk
          assert.strictEqual(rst.position, 0);
          const bufferLength = await rst.readBuffer(buf);
          assert.strictEqual(bufferLength, buf.length);
          assert.strictEqual(rst.position, buf.length);
          await rst.close();
        });

        it('should contain fileSize if constructed from file-read-stream', async () => {
          if (tokenizerType.hasFileInfo) {
            const rst = await tokenizerType.loadTokenizer('test1.dat');
            assert.strictEqual(rst.fileInfo.size, 16, ' ReadStreamTokenizer.fileSize.size');
            await rst.close();
          }
        });

        describe('Parsing binary numbers', () => {

          it('should encode signed 8-bit integer (INT8)', () => {

            const b = new Uint8Array(1);

            Token.INT8.put(b, 0, 0x00);
            assert.deepEqual(b, Uint8Array.from([0x00]));

            Token.INT8.put(b, 0, 0x22);
            assert.deepEqual(b, Uint8Array.from([0x22]));

            Token.INT8.put(b, 0, -0x22);
            assert.deepEqual(b, Uint8Array.from([0xde]));
          });

          it('should decode signed 8-bit integer (INT8)', async () => {

            const rst = await getTokenizerWithData('\x00\x7f\x80\xff\x81', tokenizerType);

            let value: number = await rst.readToken(Token.INT8);
            assert.strictEqual(typeof value, 'number');
            assert.strictEqual(value, 0, 'INT8 #1 == 0');
            value = await rst.readToken(Token.INT8);
            assert.strictEqual(typeof value, 'number');
            assert.strictEqual(value, 127, 'INT8 #2 == 127');
            value = await rst.readToken(Token.INT8);
            assert.strictEqual(typeof value, 'number');
            assert.strictEqual(value, -128, 'INT8 #3 == -128');
            value = await rst.readToken(Token.INT8);
            assert.strictEqual(typeof value, 'number');
            assert.strictEqual(value, -1, 'INT8 #4 == -1');
            value = await rst.readToken(Token.INT8);
            assert.strictEqual(typeof value, 'number');
            assert.strictEqual(value, -127, 'INT8 #5 == -127');

            await rst.close();

          });

          it('should encode signed 16-bit big-endian integer (INT16_BE)', () => {

            const b = new Uint8Array(2);

            Token.INT16_BE.put(b, 0, 0x00);
            assert.deepEqual(b, Uint8Array.from([0x00, 0x00]));

            Token.INT16_BE.put(b, 0, 0x0f0b);
            assert.deepEqual(b, Uint8Array.from([0x0f, 0x0b]));

            Token.INT16_BE.put(b, 0, -0x0f0b);
            assert.deepEqual(b, Uint8Array.from([0xf0, 0xf5]));
          });

          it('should decode signed 16-bit big-endian integer (INT16_BE)', async () => {

            const rst = await getTokenizerWithData('\x0a\x1a\x00\x00\xff\xff\x80\x00', tokenizerType);

            let value: number = await rst.readToken(Token.INT16_BE);
            assert.strictEqual(typeof value, 'number');
            assert.strictEqual(value, 2586, 'INT16_BE#1');
            value = await rst.readToken(Token.INT16_BE);
            assert.strictEqual(typeof value, 'number');
            assert.strictEqual(value, 0, 'INT16_BE#2');
            value = await rst.readToken(Token.INT16_BE);
            assert.strictEqual(typeof value, 'number');
            assert.strictEqual(value, -1, 'INT16_BE#3');
            value = await rst.readToken(Token.INT16_BE);
            assert.strictEqual(typeof value, 'number');
            assert.strictEqual(value, -32768, 'INT16_BE#4');

            await rst.close();
          });

          it('should encode signed 24-bit big-endian integer (INT24_BE)', async () => {

            const b = new Uint8Array(3);

            Token.INT24_BE.put(b, 0, 0x00);
            assert.deepEqual(b, Uint8Array.from([0x00, 0x00, 0x00]));

            Token.INT24_BE.put(b, 0, 0x0f0ba0);
            assert.deepEqual(b, Uint8Array.from([0x0f, 0x0b, 0xa0]));

            Token.INT24_BE.put(b, 0, -0x0f0bcc);
            assert.deepEqual(b, Uint8Array.from([0xf0, 0xf4, 0x34]));
          });

          it('should decode signed 24-bit big-endian integer (INT24_BE)', async () => {

            const rst = await getTokenizerWithData('\x00\x00\x00\xff\xff\xff\x10\x00\xff\x80\x00\x00', tokenizerType);

            let value: number = await rst.readToken(Token.INT24_BE);
            assert.strictEqual(typeof value, 'number');
            assert.strictEqual(value, 0, 'INT24_BE#1');
            value = await rst.readToken(Token.INT24_BE);
            assert.strictEqual(typeof value, 'number');
            assert.strictEqual(value, -1, 'INT24_BE#2');
            value = await rst.readToken(Token.INT24_BE);
            assert.strictEqual(typeof value, 'number');
            assert.strictEqual(value, 1048831, 'INT24_BE#3');
            value = await rst.readToken(Token.INT24_BE);
            assert.strictEqual(typeof value, 'number');
            assert.strictEqual(value, -8388608, 'INT24_BE#4');
            await rst.close();
          });

          // ToDo: test decoding: INT24_LE

          it('should encode signed 32-bit big-endian integer (INT32_BE)', () => {

            const b = new Uint8Array(4);

            Token.INT32_BE.put(b, 0, 0x00);
            assert.deepEqual(b, Uint8Array.from([0x00, 0x00, 0x00, 0x00]));

            Token.INT32_BE.put(b, 0, 0x0f0bcca0);
            assert.deepEqual(b, Uint8Array.from([0x0f, 0x0b, 0xcc, 0xa0]));

            Token.INT32_BE.put(b, 0, -0x0f0bcca0);
            assert.deepEqual(b, Uint8Array.from([0xf0, 0xf4, 0x33, 0x60]));
          });

          it('should decode signed 32-bit big-endian integer (INT32_BE)', async () => {

            const rst = await getTokenizerWithData('\x00\x00\x00\x00\xff\xff\xff\xff\x00\x10\x00\xff\x80\x00\x00\x00', tokenizerType);

            let value: number = await rst.readToken(Token.INT32_BE);
            assert.strictEqual(typeof value, 'number');
            assert.strictEqual(value, 0, 'INT32_BE #1');
            value = await rst.readToken(Token.INT32_BE);
            assert.strictEqual(typeof value, 'number');
            assert.strictEqual(value, -1, 'INT32_BE #2');
            value = await rst.readToken(Token.INT32_BE);
            assert.strictEqual(typeof value, 'number');
            assert.strictEqual(value, 1048831, 'INT32_BE #3');
            value = await rst.readToken(Token.INT32_BE);
            assert.strictEqual(typeof value, 'number');
            assert.strictEqual(value, -2147483648, 'INT32_BE #4');
            await rst.close();
          });

          it('should encode signed 8-bit big-endian integer (INT8)', () => {

            const b = new Uint8Array(1);

            Token.UINT8.put(b, 0, 0x00);
            assert.deepEqual(b, Uint8Array.from([0x00]));

            Token.UINT8.put(b, 0, 0xff);
            assert.deepEqual(b, Uint8Array.from([0xff]));
          });

          it('should decode unsigned 8-bit integer (UINT8)', async () => {

            const rst = await getTokenizerWithData('\x00\x1a\xff', tokenizerType);

            let value: number = await rst.readToken(Token.UINT8);
            assert.strictEqual(typeof value, 'number');
            assert.strictEqual(value, 0, 'UINT8 #1');
            value = await rst.readToken(Token.UINT8);
            assert.strictEqual(typeof value, 'number');
            assert.strictEqual(value, 26, 'UINT8 #2');
            value = await rst.readToken(Token.UINT8);
            assert.strictEqual(typeof value, 'number');
            assert.strictEqual(value, 255, 'UINT8 #3');
            await rst.close();
          });

          it('should encode unsigned 16-bit big-endian integer (UINT16_LE)', () => {

            const b = new Uint8Array(4);

            Token.UINT16_LE.put(b, 0, 0x00);
            Token.UINT16_LE.put(b, 2, 0xffaa);
            assert.deepEqual(b, Uint8Array.from([0x00, 0x00, 0xaa, 0xff]));
          });

          it('should encode unsigned 16-bit little-endian integer (UINT16_BE)', () => {
            const b = new Uint8Array(4);
            Token.UINT16_BE.put(b, 0, 0xf);
            Token.UINT16_BE.put(b, 2, 0xffaa);
            assert.deepEqual(b, Uint8Array.from([0x00, 0x0f, 0xff, 0xaa]));
          });

          it('should encode unsigned 16-bit mixed little/big-endian integers', () => {
            const b = new Uint8Array(4);
            Token.UINT16_BE.put(b, 0, 0xffaa);
            Token.UINT16_LE.put(b, 2, 0xffaa);
            assert.deepEqual(b, Uint8Array.from([0xff, 0xaa, 0xaa, 0xff]));
          });

          it('should decode unsigned mixed 16-bit big/little-endian integer', async () => {

            const rst = await getTokenizerWithData('\x1a\x00\x1a\x00\x1a\x00\x1a\x00', tokenizerType);

            let value: number = await rst.readToken(Token.UINT16_LE);
            assert.strictEqual(typeof value, 'number');
            assert.strictEqual(value, 0x001a, 'UINT16_LE #1');
            value = await rst.readToken(Token.UINT16_BE);
            assert.strictEqual(typeof value, 'number');
            assert.strictEqual(value, 0x1a00, 'UINT16_BE #2');
            value = await rst.readToken(Token.UINT16_LE);
            assert.strictEqual(typeof value, 'number');
            assert.strictEqual(value, 0x001a, 'UINT16_BE #3');
            value = await rst.readToken(Token.UINT16_BE);
            assert.strictEqual(typeof value, 'number');
            assert.strictEqual(value, 0x1a00, 'UINT16_LE #4');

            await rst.close();
          });

          it('should encode unsigned 24-bit little-endian integer (UINT24_LE)', () => {

            const b = new Uint8Array(3);

            Token.UINT24_LE.put(b, 0, 0x00);
            assert.deepEqual(b, Uint8Array.from([0x00, 0x000, 0x00]));

            Token.UINT24_LE.put(b, 0, 0xff);
            assert.deepEqual(b, Uint8Array.from([0xff, 0x00, 0x00]));

            Token.UINT24_LE.put(b, 0, 0xaabbcc);
            assert.deepEqual(b, Uint8Array.from([0xcc, 0xbb, 0xaa]));
          });

          it('should encode unsigned 24-bit big-endian integer (UINT24_BE)', () => {

            const b = new Uint8Array(3);

            Token.UINT24_BE.put(b, 0, 0x00);
            assert.deepEqual(b, Uint8Array.from([0x00, 0x00, 0x00]));

            Token.UINT24_BE.put(b, 0, 0xff);
            assert.deepEqual(b, Uint8Array.from([0x00, 0x00, 0xff]));

            Token.UINT24_BE.put(b, 0, 0xaabbcc);
            assert.deepEqual(b, Uint8Array.from([0xaa, 0xbb, 0xcc]));
          });

          it('should decode signed 24-bit big/little-endian integer (UINT24_LE/INT24_BE)', async () => {

            const rst = await getTokenizerWithData('\x1a\x1a\x00\x1a\x1a\x00\x1a\x1a\x00\x1a\x1a\x00', tokenizerType);

            let value: number = await rst.readToken(Token.UINT24_LE);
            assert.strictEqual(typeof value, 'number');
            assert.strictEqual(value, 0x001a1a, 'INT24_LE#1');
            value = await rst.readToken(Token.UINT24_BE);
            assert.strictEqual(typeof value, 'number');
            assert.strictEqual(value, 0x1a1a00, 'INT24_BE#2');
            value = await rst.readToken(Token.UINT24_LE);
            assert.strictEqual(typeof value, 'number');
            assert.strictEqual(value, 0x001a1a, 'INT24_LE#3');
            value = await rst.readToken(Token.UINT24_BE);
            assert.strictEqual(typeof value, 'number');
            assert.strictEqual(value, 0x1a1a00, 'INT24_BE#4');

            await rst.close();
          });

          it('should encode unsigned 32-bit little-endian integer (UINT32_LE)', () => {

            const b = new Uint8Array(4);

            Token.UINT32_LE.put(b, 0, 0x00);
            assert.deepEqual(b, Uint8Array.from([0x00, 0x00, 0x00, 0x00]));

            Token.UINT32_LE.put(b, 0, 0xff);
            assert.deepEqual(b, Uint8Array.from([0xff, 0x00, 0x00, 0x00]));

            Token.UINT32_LE.put(b, 0, 0xaabbccdd);
            assert.deepEqual(b, Uint8Array.from([0xdd, 0xcc, 0xbb, 0xaa]));
          });

          it('should encode unsigned 32-bit big-endian integer (INT32_BE)', () => {

            const b = new Uint8Array(4);

            Token.UINT32_BE.put(b, 0, 0x00);
            assert.deepEqual(b, Uint8Array.from([0x00, 0x00, 0x00, 0x00]));

            Token.UINT32_BE.put(b, 0, 0xff);
            assert.deepEqual(b, Uint8Array.from([0x00, 0x00, 0x00, 0xff]));

            Token.UINT32_BE.put(b, 0, 0xaabbccdd);
            assert.deepEqual(b, Uint8Array.from([0xaa, 0xbb, 0xcc, 0xdd]));
          });

          it('should decode unsigned 32-bit little/big-endian integer (UINT32_LE/UINT32_BE)', async () => {

            const rst = await getTokenizerWithData('\x1a\x00\x1a\x00\x1a\x00\x1a\x00\x1a\x00\x1a\x00\x1a\x00\x1a\x00', tokenizerType);

            let value: number = await rst.readToken(Token.UINT32_LE);
            assert.strictEqual(typeof value, 'number');
            assert.strictEqual(value, 0x001a001a, 'UINT24_LE #1');
            value = await rst.readToken(Token.UINT32_BE);
            assert.strictEqual(typeof value, 'number');
            assert.strictEqual(value, 0x1a001a00, 'UINT32_BE #2');
            value = await rst.readToken(Token.UINT32_LE);
            assert.strictEqual(typeof value, 'number');
            assert.strictEqual(value, 0x001a001a, 'UINT32_LE #3');
            value = await rst.readToken(Token.UINT32_BE);
            assert.strictEqual(typeof value, 'number');
            assert.strictEqual(value, 0x1a001a00, 'UINT32_BE #4');

            await rst.close();
          });

        });

        it('Transparency', async function() {

          this.timeout(5000);

          const size = 10 * 1024;
          const buf = new Uint8Array(size);

          for (let i = 0; i < size; ++i) {
            buf[i] = i % 255;
          }

          const testFile = 'test2.dat';
          const pathTestFile = Path.join(__dirname, 'resources', testFile);
          await fs.writeFile(pathTestFile, buf);

          const rst = await tokenizerType.loadTokenizer(testFile);
          let expected = 0;

          try {
            let v: number;
            do {
              v = await rst.readNumber(Token.UINT8);
              assert.strictEqual(v, expected % 255, `offset=${expected}`);
              ++expected;
            } while (v > 0);
          } catch (err) {
            assert.instanceOf(err, EndOfStreamError);
            assert.strictEqual(expected, size, 'total number of parsed bytes');
          }

          await rst.close();
        });

        it('Handle peek token', async () => {

          async function peekOnData(tokenizer: ITokenizer): Promise<void> {
            assert.strictEqual(tokenizer.position, 0);

            let value = await tokenizer.peekToken<number>(Token.UINT32_LE);
            assert.strictEqual(typeof value, 'number');
            assert.strictEqual(value, 0x001a001a, 'UINT24_LE #1');
            assert.strictEqual(tokenizer.position, 0);

            value = await tokenizer.peekToken(Token.UINT32_LE);
            assert.strictEqual(typeof value, 'number');
            assert.strictEqual(value, 0x001a001a, 'UINT24_LE sequential peek #2');
            assert.strictEqual(tokenizer.position, 0);
            value = await tokenizer.readToken(Token.UINT32_LE);

            assert.strictEqual(typeof value, 'number');
            assert.strictEqual(value, 0x001a001a, 'UINT24_LE #3');
            assert.strictEqual(tokenizer.position, 4);
            value = await tokenizer.readToken(Token.UINT32_BE);
            assert.strictEqual(typeof value, 'number');
            assert.strictEqual(value, 0x1a001a00, 'UINT32_BE #4');
            assert.strictEqual(tokenizer.position, 8);
            value = await tokenizer.readToken(Token.UINT32_LE);

            assert.strictEqual(typeof value, 'number');
            assert.strictEqual(value, 0x001a001a, 'UINT32_LE #5');
            assert.strictEqual(tokenizer.position, 12);
            value = await tokenizer.readToken(Token.UINT32_BE);

            assert.strictEqual(typeof value, 'number');
            assert.strictEqual(value, 0x1a001a00, 'UINT32_BE #6');
            assert.strictEqual(tokenizer.position, 16);

          }

          const rst = await tokenizerType.loadTokenizer('test1.dat');

          if (rst.supportsRandomAccess()) {
            assert.strictEqual(rst.fileInfo.size, 16, 'check file size property');
          }
          await peekOnData(rst);
          await rst.close();
        });

        it('Overlapping peeks', async () => {

          const rst = await getTokenizerWithData('\x01\x02\x03\x04\x05', tokenizerType);
          const peekBuffer = new Uint8Array(3);
          const readBuffer = new Uint8Array(1);

          assert.strictEqual(0, rst.position);
          let len = await rst.peekBuffer(peekBuffer, {length: 3}); // Peek #1
          assert.strictEqual(3, len);
          assert.deepEqual(peekBuffer, stringToUint8Array('\x01\x02\x03'), 'Peek #1');
          assert.strictEqual(rst.position, 0);
          len = await rst.readBuffer(readBuffer, {length: 1}); // Read #1
          assert.strictEqual(len, 1);
          assert.strictEqual(rst.position, 1);
          assert.deepEqual(readBuffer, stringToUint8Array('\x01'), 'Read #1');
          len = await rst.peekBuffer(peekBuffer, {length: 3}); // Peek #2
          assert.strictEqual(len, 3);
          assert.strictEqual(rst.position, 1);
          assert.deepEqual(peekBuffer, stringToUint8Array('\x02\x03\x04'), 'Peek #2');
          len = await rst.readBuffer(readBuffer, {length: 1}); // Read #2
          assert.strictEqual(len, 1);
          assert.strictEqual(rst.position, 2);
          assert.deepEqual(readBuffer, stringToUint8Array('\x02'), 'Read #2');
          len = await rst.peekBuffer(peekBuffer, {length: 3}); // Peek #3
          assert.strictEqual(len, 3);
          assert.strictEqual(rst.position, 2);
          assert.deepEqual(peekBuffer, stringToUint8Array('\x03\x04\x05'), 'Peek #3');
          len = await rst.readBuffer(readBuffer, {length: 1}); // Read #3
          assert.strictEqual(len, 1);
          assert.strictEqual(rst.position, 3);
          assert.deepEqual(readBuffer, stringToUint8Array('\x03'), 'Read #3');
          len = await rst.peekBuffer(peekBuffer, {length: 2}); // Peek #4
          assert.strictEqual(len, 2, '3 bytes requested to peek, only 2 bytes left');
          assert.strictEqual(rst.position, 3);
          assert.deepEqual(peekBuffer, stringToUint8Array('\x04\x05\x05'), 'Peek #4');
          len = await rst.readBuffer(readBuffer, {length: 1}); // Read #4
          assert.strictEqual(len, 1);
          assert.strictEqual(rst.position, 4);
          assert.deepEqual(readBuffer, stringToUint8Array('\x04'), 'Read #4');

          await rst.close();
        });

        it('should be able to read at position ahead', async () => {

          const rst = await getTokenizerWithData('\x05peter', tokenizerType);
          // should decode string from chunk
          assert.strictEqual(rst.position, 0);
          const value = await rst.readToken(new Token.StringType(5, 'utf-8'), 1);
          assert.strictEqual(typeof value, 'string');
          assert.strictEqual(value, 'peter');
          assert.strictEqual(rst.position, 6);
          // should should reject at the end of the stream
          try {
            await rst.readToken(Token.UINT8);
            assert.fail('Should reject due to end-of-stream');
          } catch (err) {
            assert.instanceOf(err, EndOfStreamError);
          } finally {
            await rst.close();
          }
        });

        it('should be able to peek at position ahead', async () => {

          const rst = await getTokenizerWithData('\x05peter', tokenizerType);
          // should decode string from chunk
          assert.strictEqual(rst.position, 0);
          const value = await rst.peekToken(new Token.StringType(5, 'latin1'), 1);
          assert.strictEqual(typeof value, 'string');
          assert.strictEqual(value, 'peter');
          assert.strictEqual(rst.position, 0);

          await rst.close();
        });

        it('number', async () => {
          const tokenizer = await tokenizerType.loadTokenizer('test3.dat');
          assert.isDefined(tokenizer.fileInfo, 'tokenizer.fileInfo');
          // @ts-ignore
          await tokenizer.ignore(1);
          const x = await tokenizer.peekNumber(Token.INT32_BE);
          assert.strictEqual(x, 33752069);

          await tokenizer.close();
        });

        it('should throw an Error if we reach EOF while peeking a number', async () => {
          const tokenizer = await tokenizerType.loadTokenizer('test3.dat');
          if (tokenizerType.hasFileInfo) {
            assert.isDefined(tokenizer.fileInfo, 'tokenizer.fileInfo');
          }
          // @ts-ignore
          await tokenizer.ignore(2);
          try {
            await tokenizer.peekNumber(Token.INT32_BE);
            assert.fail('Should throw Error: End-Of-File');
          } catch (err) {
            assert.instanceOf(err, EndOfStreamError);
          }
          await tokenizer.close();
        });

        it('should be able to handle multiple ignores', async () => {
          const tokenizer = await tokenizerType.loadTokenizer('test1.dat');
          let value = await tokenizer.readToken(Token.UINT32_LE);
          assert.strictEqual(typeof value, 'number');
          assert.strictEqual(value, 0x001a001a, 'UINT24_LE #1');
          await tokenizer.ignore(Token.UINT32_BE.len);
          await tokenizer.ignore(Token.UINT32_LE.len);
          value = await tokenizer.readToken(Token.UINT32_BE);
          assert.strictEqual(typeof value, 'number');
          assert.strictEqual(value, 0x1a001a00, 'UINT32_BE #4');
          await tokenizer.close();
        });

        it('should be able to ignore (skip)', async () => {

          const tokenizer = await tokenizerType.loadTokenizer('test1.dat');
          assert.strictEqual(tokenizer.position, 0);
          await tokenizer.ignore(4);
          assert.strictEqual(tokenizer.position, 4);
          let value = await tokenizer.readToken(Token.UINT32_BE);
          assert.strictEqual(typeof value, 'number');
          assert.strictEqual(value, 0x1a001a00, 'UINT32_BE #2');
          value = await tokenizer.readToken(Token.UINT32_LE);
          assert.strictEqual(typeof value, 'number');
          assert.strictEqual(value, 0x001a001a, 'UINT32_LE #3');
          value = await tokenizer.readToken(Token.UINT32_BE);
          assert.strictEqual(typeof value, 'number');
          assert.strictEqual(value, 0x1a001a00, 'UINT32_BE #4');
          await tokenizer.close();
        });

        describe('End-Of-File exception behaviour', () => {

          it('should not throw an Error if we read exactly until the end of the file', async () => {

            const rst = await getTokenizerWithData('\x89\x54\x40', tokenizerType);
            const num = await rst.readToken(Token.UINT24_BE);
            assert.strictEqual(num, 9000000);
            await rst.close();
          });

          it('readBuffer()', async () => {

            const testFile = 'test1.dat';

            const stat = await fs.stat(getResourcePath(testFile));
            const tokenizer = await tokenizerType.loadTokenizer(testFile);
            const buf = new Uint8Array(stat.size);
            const bytesRead = await tokenizer.readBuffer(buf);
            assert.ok(typeof bytesRead === 'number', 'readBuffer promise should provide a number');
            assert.strictEqual(stat.size, bytesRead);
            try {
              await tokenizer.readBuffer(buf);
              assert.fail('Should throw EOF');
            } catch (err) {
              assert.instanceOf(err, EndOfStreamError);
            } finally {
              await tokenizer.close();
            }
          });

          it('should handle zero byte read', async () => {

            const rst = await getTokenizerWithData('\x00\x00\x00', tokenizerType);
            const uint8Array = await rst.readToken(new Token.Uint8ArrayType(0));
            assert.strictEqual(uint8Array.length, 0);
            await rst.close();
          });

          it('should not throw an Error if we read exactly until the end of the file', async () => {

            const rst = await getTokenizerWithData('\x89\x54\x40', tokenizerType);
            const num = await rst.readToken(Token.UINT24_BE);
            assert.strictEqual(num, 9000000);
            await rst.close();
          });

          it('should be thrown if a token EOF reached in the middle of a token', async () => {

            const rst = await getTokenizerWithData('\x89\x54\x40', tokenizerType);
            try {
              await rst.readToken(Token.INT32_BE);
              assert.fail('It should throw EndOfFile Error');
            } catch (err) {
              assert.instanceOf(err, EndOfStreamError);
            } finally {
              await rst.close();
            }
          });

          it('should throw an EOF if we read to buffer', async () => {
            const buffer = new Uint8Array(4);

            const rst = await getTokenizerWithData('\x89\x54\x40', tokenizerType);
            try {
              await rst.readBuffer(buffer);
              assert.fail('It should throw EndOfFile Error');
            } catch (err) {
              assert.instanceOf(err, EndOfStreamError);
            } finally {
              await rst.close();
            }
          });

          it('should throw an EOF if we peek to buffer', async () => {

            const buffer = new Uint8Array(4);
            const rst = await getTokenizerWithData('\x89\x54\x40', tokenizerType);
            try {
              await rst.peekBuffer(buffer);
              assert.fail('It should throw EndOfFile Error');
            } catch (err) {
              assert.instanceOf(err, EndOfStreamError);
            } finally {
              await rst.close();
            }
          });

        });

        it('should be able to read from a file', async () => {

          const tokenizer = await tokenizerType.loadTokenizer('test1.dat');
          if (tokenizerType.hasFileInfo) {
            assert.strictEqual(tokenizer.fileInfo.size, 16, 'check file size property');
          }
          let value = await tokenizer.readToken(Token.UINT32_LE);
          assert.strictEqual(typeof value, 'number');
          assert.strictEqual(value, 0x001a001a, 'UINT24_LE #1');
          value = await tokenizer.readToken(Token.UINT32_BE);
          assert.strictEqual(typeof value, 'number');
          assert.strictEqual(value, 0x1a001a00, 'UINT32_BE #2');
          value = await tokenizer.readToken(Token.UINT32_LE);
          assert.strictEqual(typeof value, 'number');
          assert.strictEqual(value, 0x001a001a, 'UINT32_LE #3');
          value = await tokenizer.readToken(Token.UINT32_BE);
          assert.strictEqual(typeof value, 'number');
          assert.strictEqual(value, 0x1a001a00, 'UINT32_BE #4');
          await tokenizer.close();
        });

        it('should be able to parse the IgnoreType-token', async () => {
          const tokenizer = await tokenizerType.loadTokenizer('test1.dat');
          await tokenizer.readToken(new Token.IgnoreType(4));
          let value = await tokenizer.readToken(Token.UINT32_BE);
          assert.strictEqual(typeof value, 'number');
          assert.strictEqual(value, 0x1a001a00, 'UINT32_BE #2');
          value = await tokenizer.readToken(Token.UINT32_LE);
          assert.strictEqual(typeof value, 'number');
          assert.strictEqual(value, 0x001a001a, 'UINT32_LE #3');
          value = await tokenizer.readToken(Token.UINT32_BE);
          assert.strictEqual(typeof value, 'number');
          assert.strictEqual(value, 0x1a001a00, 'UINT32_BE #4');
          await tokenizer.close();
        });

        it('should be able to read 0 bytes from a file', async () => {
          const bufZero = new Uint8Array(0);
          const tokenizer = await tokenizerType.loadTokenizer('test1.dat');
          try {
            await tokenizer.readBuffer(bufZero);
          } finally {
            await tokenizer.close();
          }
        });

        if (tokenizerType.abortable) {

          describe('Abort delayed read', () => {

            it('without aborting', async () => {
              const fileReadStream = await getTokenizerWithData('123', tokenizerType, 500);
              try {
                const promise = fileReadStream.readToken(new Token.StringType(3, 'utf-8'), 0);
                assert.strictEqual(await promise, '123');
              } finally {
                await fileReadStream.close();
              }
            });

            it('abort async operation using `abort()`', async function() {
              if (process.versions.bun) {
                this.skip(); // Fails with Bun 1.2
              }
              const fileReadStream = await getTokenizerWithData('123', tokenizerType, 500);
              try {
                const promise = fileReadStream.readToken(new Token.StringType(3, 'utf-8'), 0);
                await fileReadStream.abort();
                await expect(promise).to.be.rejectedWith(Error);
              } finally {
                await fileReadStream.close();
              }
            });

            it('abort async operation using `close()`', async function() {
              if (process.versions.bun) {
                this.skip(); // Fails with Bun 1.2
              }
              const fileReadStream = await getTokenizerWithData('123', tokenizerType, 500);
              const promise = fileReadStream.readToken(new Token.StringType(3, 'utf-8'), 0);
              await fileReadStream.close();
              await expect(promise).to.be.rejectedWith(Error);
            });

            it('abort async operation using `AbortController`', async function() {

              if (process.versions.bun) {
                this.skip(); // Fails with Bun 1.2
              }

              const abortController = new AbortController();
              const fileReadStream = await getTokenizerWithData('123', tokenizerType, 500, abortController.signal);
              try {
                const promise = fileReadStream.readToken(new Token.StringType(3, 'utf-8'), 0);
                abortController.abort();
                await expect(promise).to.be.rejectedWith(Error);
              } finally {
                await fileReadStream.close();
              }
            });

          });
        }

      }); // End of test "Tokenizer-types"
    });

  describe('Random-read-access', async () => {

    tokenizerTests
      .filter(tokenizerType => tokenizerType.randomRead)
      .forEach(tokenizerType => {
        describe(tokenizerType.name, () => {

          it('Read ID3v1 header at the end of the file', async () => {
            const tokenizer = await tokenizerType.loadTokenizer('id3v1.mp3') as IRandomAccessTokenizer;
            try {
              assert.isTrue(tokenizer.supportsRandomAccess(), 'Tokenizer should support random reads');
              const id3HeaderSize = 128;
              const id3Header = new Uint8Array(id3HeaderSize);
              await tokenizer.readBuffer(id3Header, {position: tokenizer.fileInfo.size - id3HeaderSize});
              const id3Tag = new TextDecoder('utf-8').decode(id3Header.subarray(0, 3));
              assert.strictEqual(id3Tag, 'TAG');
              assert.strictEqual(tokenizer.position, tokenizer.fileInfo.size, 'Tokenizer position should be at the end of the file');
              tokenizer.setPosition(0);
              assert.strictEqual(tokenizer.position, 0, 'Tokenizer position should be at the beginning of the file');
            } finally {
              await tokenizer.close();
            }
          });

          it('Be able to random read from position 0', async () => {
            const tokenizer = await fromFile(getResourcePath('id3v1.mp3'));
            try {
              // Advance tokenizer.position
              await tokenizer.ignore(20);
              const mpegSync = new Uint8Array(2);
              await tokenizer.readBuffer(mpegSync, {position: 0});
              assert.strictEqual(mpegSync[0], 255, 'First sync byte');
              assert.strictEqual(mpegSync[1], 251, 'Second sync byte');
            } finally {
              await tokenizer.close();
            }

          });
        });
      });

  });
});

describe('fromStream with mayBeLess flag', () => {

  it('mayBeLess=true', async () => {
    // Initialize empty stream
    const stream = new PassThrough();
    const tokenizer = await fromStream(stream);
    try {
      stream.end();

      // Try to read 5 bytes from empty stream, with mayBeLess flag enabled
      const buffer = new Uint8Array(5);
      const bytesRead = await tokenizer.peekBuffer(buffer, {mayBeLess: true});
      assert.strictEqual(bytesRead, 0);
    } finally {
      await tokenizer.close();
    }
  });

  it('mayBeLess=false', async () => {
    // Initialize empty stream
    const stream = new PassThrough();
    const tokenizer = await fromStream(stream);
    try {
      stream.end();

      // Try to read 5 bytes from empty stream, with mayBeLess flag enabled
      const buffer = new Uint8Array(5);
      await tokenizer.peekBuffer(buffer, {mayBeLess: false});
    } catch (err) {
      if (err instanceof Error) {
        assert.strictEqual(err.message, 'End-Of-Stream');
      } else {
        assert.fail('Expected: err instanceof Error');
      }
      return;
    } finally {
      if (tokenizer) {
        await tokenizer.close();
      }
    }
    assert.fail('Should throw End-Of-Stream error');
  });

});

it('should determine the file size using a file stream', async () => {
  const stream = createReadStream(Path.join(__dirname, 'resources', 'test1.dat'));
  const tokenizer = await fromStream(stream);
  try {
    assert.isDefined(tokenizer.fileInfo, '`fileInfo` should be defined');
    assert.strictEqual(tokenizer.fileInfo.size, 16, 'fileInfo.size');
  } finally {
    await tokenizer.close();
  }
});

it('should release stream after close', async () => {

  const fileStream = makeByteReadableStreamFromFile(Path.join(__dirname, 'resources', 'test1.dat'), 0);
  assert.isFalse(fileStream.locked, 'stream is unlocked before initializing tokenizer');
  const webStreamTokenizer = fromWebStream(fileStream);
  assert.isTrue(fileStream.locked, 'stream is locked after initializing tokenizer');
  await webStreamTokenizer.close();
  assert.isFalse(fileStream.locked, 'stream is unlocked after closing tokenizer');
});
