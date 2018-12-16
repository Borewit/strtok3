import * as Token from 'token-types';
import { assert } from 'chai';
import * as strtok3 from '../src/index';
import * as Path from 'path';
import { endOfFile, ITokenizer } from '../src/type';
import * as fs from '../src/FsPromise';
import { FileTokenizer } from '../src/FileTokenizer';

interface ITokenizerTest {
  name: string;
  loadTokenizer: (testFile: string) => Promise<ITokenizer>;
}

describe('Tokenizer-types', () => {

  function getResourcePath(testFile: string) {
    return Path.join(__dirname, 'resources', testFile);
  }

  async function getTokenizerWithData(testData: string, test: ITokenizerTest): Promise<ITokenizer> {
    const testPath = getResourcePath('tmp.dat');
    await fs.writeFile(testPath, Buffer.from(testData, 'binary'));
    return test.loadTokenizer('tmp.dat');
  }

  const tokenizerTests: ITokenizerTest[] = [
    {
      name: 'fromStream()',
      loadTokenizer: testFile => {
        const stream = fs.createReadStream(getResourcePath(testFile));
        return strtok3.fromStream(stream);
      }
    },
    {
      name: 'fromFile()',
      loadTokenizer: testFile => {
        return strtok3.fromFile(Path.join(__dirname, 'resources', testFile));
      }
    }
    ,
    {
      name: 'fromBuffer()',
      loadTokenizer: testFile => {
        return fs.readFile(Path.join(__dirname, 'resources', testFile)).then(data => {
          return strtok3.fromBuffer(data);
        });
      }
    }
  ];

  tokenizerTests.forEach(tokenizerType => {

    describe(tokenizerType.name, () => {

      it('should decode buffer', async () => {

        const rst = await getTokenizerWithData('\x05peter', tokenizerType);
        // should decode UINT8 from chunk
        assert.strictEqual(rst.position, 0);
        let value: string | number = await rst.readToken(Token.UINT8);
        assert.ok(typeof value === 'number');
        assert.equal(value, 5, '0x05 == 5');
        // should decode string from chunk
        assert.strictEqual(rst.position, 1);
        value = await rst.readToken(new Token.StringType(5, 'utf-8'));
        assert.ok(typeof value === 'string');
        assert.equal(value, 'peter');
        assert.strictEqual(rst.position, 6);
        // should should reject at the end of the stream
        try {
          value = await rst.readToken(Token.UINT8);
          assert.fail('Should reject due to end-of-stream');
        } catch (err) {
          assert.equal(err.message, endOfFile);
        }
      });

      it('should be able to read from an absolute offset', async () => {

        const rst = await getTokenizerWithData('\x05peter', tokenizerType);
        // should decode UINT8 from chunk
        assert.strictEqual(rst.position, 0);
        const value: string | number = await rst.readToken(new Token.StringType(5, 'utf-8'), 1);
        assert.ok(typeof value === 'string');
        assert.equal(value, 'peter');
        assert.strictEqual(rst.position, 6);

        try {
          await rst.readToken(Token.UINT8);
          assert.fail('Should reject due to end-of-stream');
        } catch (err) {
          assert.equal(err.message, endOfFile);
        }

      });

      it('should pick length from buffer, if length is not explicit defined', async () => {

        const rst = await getTokenizerWithData('\x05peter', tokenizerType);

        const buf = Buffer.alloc(4);

        // should decode UINT8 from chunk
        assert.strictEqual(rst.position, 0);
        const bufferLength = await rst.readBuffer(buf);
        assert.strictEqual(bufferLength, buf.length);
        assert.strictEqual(rst.position, buf.length);
      });

      it('should contain fileSize if constructed from file-read-stream', async () => {

        // ToDo
        const rst = await tokenizerType.loadTokenizer('test1.dat');
        assert.equal(rst.fileSize, 16, ' ReadStreamTokenizer.fileSize');

        await rst.close();
      });

      describe('Parsing binary numbers', () => {

        it('should encode signed 8-bit integer (INT8)', () => {

          const b = Buffer.alloc(1);

          Token.INT8.put(b, 0, 0x00);
          assert.strictEqual(b.toString('binary'), '\x00');

          Token.INT8.put(b, 0, 0x22);
          assert.strictEqual(b.toString('binary'), '\x22');

          Token.INT8.put(b, 0, -0x22);
          assert.strictEqual(b.toString('binary'), '\xde');
        });

        it('should decode signed 8-bit integer (INT8)', async () => {

          const rst = await getTokenizerWithData('\x00\x7f\x80\xff\x81', tokenizerType);

          let value: number = await rst.readToken(Token.INT8);
          assert.ok(typeof value === 'number');
          assert.equal(value, 0, 'INT8 #1 == 0');
          value = await rst.readToken(Token.INT8);
          assert.ok(typeof value === 'number');
          assert.equal(value, 127, 'INT8 #2 == 127');
          value = await rst.readToken(Token.INT8);
          assert.ok(typeof value === 'number');
          assert.equal(value, -128, 'INT8 #3 == -128');
          value = await rst.readToken(Token.INT8);
          assert.ok(typeof value === 'number');
          assert.equal(value, -1, 'INT8 #4 == -1');
          value = await rst.readToken(Token.INT8);
          assert.ok(typeof value === 'number');
          assert.equal(value, -127, 'INT8 #5 == -127');

          await rst.close();

        });

        it('should encode signed 16-bit big-endian integer (INT16_BE)', () => {

          const b = Buffer.alloc(2);

          Token.INT16_BE.put(b, 0, 0x00);
          assert.strictEqual(b.toString('binary'), '\x00\x00');

          Token.INT16_BE.put(b, 0, 0x0f0b);
          assert.strictEqual(b.toString('binary'), '\x0f\x0b');

          Token.INT16_BE.put(b, 0, -0x0f0b);
          assert.strictEqual(b.toString('binary'), '\xf0\xf5');
        });

        it('should decode signed 16-bit big-endian integer (INT16_BE)', async () => {

          const rst = await getTokenizerWithData('\x0a\x1a\x00\x00\xff\xff\x80\x00', tokenizerType);

          let value: number = await rst.readToken(Token.INT16_BE);
          assert.ok(typeof value === 'number');
          assert.equal(value, 2586, 'INT16_BE#1');
          value = await rst.readToken(Token.INT16_BE);
          assert.ok(typeof value === 'number');
          assert.equal(value, 0, 'INT16_BE#2');
          value = await rst.readToken(Token.INT16_BE);
          assert.ok(typeof value === 'number');
          assert.equal(value, -1, 'INT16_BE#3');
          value = await rst.readToken(Token.INT16_BE);
          assert.ok(typeof value === 'number');
          assert.equal(value, -32768, 'INT16_BE#4');

          await rst.close();
        });

        it('should encode signed 24-bit big-endian integer (INT24_BE)', async () => {

          const b = Buffer.alloc(3);

          Token.INT24_BE.put(b, 0, 0x00);
          assert.strictEqual(b.toString('binary'), '\x00\x00\x00');

          Token.INT24_BE.put(b, 0, 0x0f0ba0);
          assert.strictEqual(b.toString('binary'), '\x0f\x0b\xa0');

          Token.INT24_BE.put(b, 0, -0x0f0bcc);
          assert.strictEqual(b.toString('binary'), '\xf0\xf4\x34');
        });

        it('should decode signed 24-bit big-endian integer (INT24_BE)', async () => {

          const rst = await getTokenizerWithData('\x00\x00\x00\xff\xff\xff\x10\x00\xff\x80\x00\x00', tokenizerType);

          let value: number = await rst.readToken(Token.INT24_BE);
          assert.ok(typeof value === 'number');
          assert.equal(value, 0, 'INT24_BE#1');
          value = await rst.readToken(Token.INT24_BE);
          assert.ok(typeof value === 'number');
          assert.equal(value, -1, 'INT24_BE#2');
          value = await rst.readToken(Token.INT24_BE);
          assert.ok(typeof value === 'number');
          assert.equal(value, 1048831, 'INT24_BE#3');
          value = await rst.readToken(Token.INT24_BE);
          assert.ok(typeof value === 'number');
          assert.equal(value, -8388608, 'INT24_BE#4');
          await rst.close();
        });

        // ToDo: test decoding: INT24_LE

        it('should encode signed 32-bit big-endian integer (INT32_BE)', () => {

          const b = Buffer.alloc(4);

          Token.INT32_BE.put(b, 0, 0x00);
          assert.strictEqual(b.toString('binary'), '\x00\x00\x00\x00');

          Token.INT32_BE.put(b, 0, 0x0f0bcca0);
          assert.strictEqual(b.toString('binary'), '\x0f\x0b\xcc\xa0');

          Token.INT32_BE.put(b, 0, -0x0f0bcca0);
          assert.strictEqual(b.toString('binary'), '\xf0\xf4\x33\x60');
        });

        it('should decode signed 32-bit big-endian integer (INT32_BE)', async () => {

          const rst = await getTokenizerWithData('\x00\x00\x00\x00\xff\xff\xff\xff\x00\x10\x00\xff\x80\x00\x00\x00', tokenizerType);

          let value: number = await rst.readToken(Token.INT32_BE);
          assert.ok(typeof value === 'number');
          assert.equal(value, 0, 'INT32_BE #1');
          value = await rst.readToken(Token.INT32_BE);
          assert.ok(typeof value === 'number');
          assert.equal(value, -1, 'INT32_BE #2');
          value = await rst.readToken(Token.INT32_BE);
          assert.ok(typeof value === 'number');
          assert.equal(value, 1048831, 'INT32_BE #3');
          value = await rst.readToken(Token.INT32_BE);
          assert.ok(typeof value === 'number');
          assert.equal(value, -2147483648, 'INT32_BE #4');
          await rst.close();
        });

        it('should encode signed 8-bit big-endian integer (INT8)', () => {

          const b = Buffer.alloc(1);

          Token.UINT8.put(b, 0, 0x00);
          assert.strictEqual(b.toString('binary'), '\x00');

          Token.UINT8.put(b, 0, 0xff);
          assert.strictEqual(b.toString('binary'), '\xff');
        });

        it('should decode unsigned 8-bit integer (UINT8)', async () => {

          const rst = await getTokenizerWithData('\x00\x1a\xff', tokenizerType);

          let value: number = await rst.readToken(Token.UINT8);
          assert.ok(typeof value === 'number');
          assert.equal(value, 0, 'UINT8 #1');
          value = await rst.readToken(Token.UINT8);
          assert.ok(typeof value === 'number');
          assert.equal(value, 26, 'UINT8 #2');
          value = await rst.readToken(Token.UINT8);
          assert.ok(typeof value === 'number');
          assert.equal(value, 255, 'UINT8 #3');
          await rst.close();
        });

        it('should encode unsigned 16-bit big-endian integer (UINT16_LE)', () => {

          const b = Buffer.alloc(4);

          Token.UINT16_LE.put(b, 0, 0x00);
          Token.UINT16_LE.put(b, 2, 0xffaa);
          assert.strictEqual(b.toString('binary'), '\x00\x00\xaa\xff');
        });

        it('should encode unsigned 16-bit little-endian integer (UINT16_BE)', () => {
          const b = Buffer.alloc(4);
          Token.UINT16_BE.put(b, 0, 0xf);
          Token.UINT16_BE.put(b, 2, 0xffaa);
          assert.strictEqual(b.toString('binary'), '\x00\x0f\xff\xaa');
        });

        it('should encode unsigned 16-bit mixed little/big-endian integers', () => {
          const b = Buffer.alloc(4);
          Token.UINT16_BE.put(b, 0, 0xffaa);
          Token.UINT16_LE.put(b, 2, 0xffaa);
          assert.strictEqual(b.toString('binary'), '\xff\xaa\xaa\xff');
        });

        it('should decode unsigned mixed 16-bit big/little-endian integer', async () => {

          const rst = await getTokenizerWithData('\x1a\x00\x1a\x00\x1a\x00\x1a\x00', tokenizerType);

          let value: number = await rst.readToken(Token.UINT16_LE);
          assert.ok(typeof value === 'number');
          assert.equal(value, 0x001a, 'UINT16_LE #1');
          value = await rst.readToken(Token.UINT16_BE);
          assert.ok(typeof value === 'number');
          assert.equal(value, 0x1a00, 'UINT16_BE #2');
          value = await rst.readToken(Token.UINT16_LE);
          assert.ok(typeof value === 'number');
          assert.equal(value, 0x001a, 'UINT16_BE #3');
          value = await rst.readToken(Token.UINT16_BE);
          assert.ok(typeof value === 'number');
          assert.equal(value, 0x1a00, 'UINT16_LE #4');

          await rst.close();
        });

        it('should encode unsigned 24-bit little-endian integer (UINT24_LE)', () => {

          const b = Buffer.alloc(3);

          Token.UINT24_LE.put(b, 0, 0x00);
          assert.strictEqual(b.toString('binary'), '\x00\x00\x00');

          Token.UINT24_LE.put(b, 0, 0xff);
          assert.strictEqual(b.toString('binary'), '\xff\x00\x00');

          Token.UINT24_LE.put(b, 0, 0xaabbcc);
          assert.strictEqual(b.toString('binary'), '\xcc\xbb\xaa');
        });

        it('should encode unsigned 24-bit big-endian integer (UINT24_BE)', () => {

          const b = Buffer.alloc(3);

          Token.UINT24_BE.put(b, 0, 0x00);
          assert.strictEqual(b.toString('binary'), '\x00\x00\x00');

          Token.UINT24_BE.put(b, 0, 0xff);
          assert.strictEqual(b.toString('binary'), '\x00\x00\xff');

          Token.UINT24_BE.put(b, 0, 0xaabbcc);
          assert.strictEqual(b.toString('binary'), '\xaa\xbb\xcc');
        });

        it('should decode signed 24-bit big/little-endian integer (UINT24_LE/INT24_BE)', async () => {

          const rst = await getTokenizerWithData('\x1a\x1a\x00\x1a\x1a\x00\x1a\x1a\x00\x1a\x1a\x00', tokenizerType);

          let value: number = await rst.readToken(Token.UINT24_LE);
          assert.ok(typeof value === 'number');
          assert.equal(value, 0x001a1a, 'INT24_LE#1');
          value = await rst.readToken(Token.UINT24_BE);
          assert.ok(typeof value === 'number');
          assert.equal(value, 0x1a1a00, 'INT24_BE#2');
          value = await rst.readToken(Token.UINT24_LE);
          assert.ok(typeof value === 'number');
          assert.equal(value, 0x001a1a, 'INT24_LE#3');
          value = await rst.readToken(Token.UINT24_BE);
          assert.ok(typeof value === 'number');
          assert.equal(value, 0x1a1a00, 'INT24_BE#4');

          await rst.close();
        });

        it('should encode unsigned 32-bit little-endian integer (UINT32_LE)', () => {

          const b = Buffer.alloc(4);

          Token.UINT32_LE.put(b, 0, 0x00);
          assert.strictEqual(b.toString('binary'), '\x00\x00\x00\x00');

          Token.UINT32_LE.put(b, 0, 0xff);
          assert.strictEqual(b.toString('binary'), '\xff\x00\x00\x00');

          Token.UINT32_LE.put(b, 0, 0xaabbccdd);
          assert.strictEqual(b.toString('binary'), '\xdd\xcc\xbb\xaa');
        });

        it('should encode unsigned 32-bit big-endian integer (INT32_BE)', () => {

          const b = Buffer.alloc(4);

          Token.UINT32_BE.put(b, 0, 0x00);
          assert.strictEqual(b.toString('binary'), '\x00\x00\x00\x00');

          Token.UINT32_BE.put(b, 0, 0xff);
          assert.strictEqual(b.toString('binary'), '\x00\x00\x00\xff');

          Token.UINT32_BE.put(b, 0, 0xaabbccdd);
          assert.strictEqual(b.toString('binary'), '\xaa\xbb\xcc\xdd');
        });

        it('should decode unsigned 32-bit little/big-endian integer (UINT32_LE/UINT32_BE)', async () => {

          const rst = await getTokenizerWithData('\x1a\x00\x1a\x00\x1a\x00\x1a\x00\x1a\x00\x1a\x00\x1a\x00\x1a\x00', tokenizerType);

          let value: number = await rst.readToken(Token.UINT32_LE);
          assert.ok(typeof value === 'number');
          assert.equal(value, 0x001a001a, 'UINT24_LE #1');
          return rst.readToken(Token.UINT32_BE);
          assert.ok(typeof value === 'number');
          assert.equal(value, 0x1a001a00, 'UINT32_BE #2');
          value = await rst.readToken(Token.UINT32_LE);
          assert.ok(typeof value === 'number');
          assert.equal(value, 0x001a001a, 'UINT32_LE #3');
          value = await rst.readToken(Token.UINT32_BE);
          assert.ok(typeof value === 'number');
          assert.equal(value, 0x1a001a00, 'UINT32_BE #4');

          await rst.close();
        });

      });

      it.skip('Transparency', async function() {

        this.timeout(5000);

        const size = 10 * 1024;
        const buf = Buffer.alloc(size);

        for (let i = 0; i < size; ++i) {
          buf[i] = i % 255;
        }

        const testFile = 'test2.dat';
        const pathTestFile = Path.join(__dirname, 'resources', testFile);
        await fs.writeFile(pathTestFile, buf);

        const rst = await tokenizerType.loadTokenizer(testFile);
        let expected = 0;

        function readByte() {
          return rst.readNumber(Token.UINT8)
            .then(v => {
              assert.equal(v, expected % 255, 'offset=' + expected);
              ++expected;
              return readByte();
            });
        }

        try {
          await readByte();
        } catch (err) {
          assert.equal(err.message, 'End-Of-File');
          assert.equal(expected, size, 'total number of parsed bytes');
        }

        await rst.close();
      });

      it('Handle peek token', async () => {

        async function peekOnData(tokenizer: ITokenizer): Promise<void> {
          assert.strictEqual(tokenizer.position, 0);

          let value = await tokenizer.peekToken<number>(Token.UINT32_LE);
          assert.ok(typeof value === 'number');
          assert.equal(value, 0x001a001a, 'UINT24_LE #1');
          assert.strictEqual(tokenizer.position, 0);

          value = await tokenizer.peekToken(Token.UINT32_LE);
          assert.ok(typeof value === 'number');
          assert.equal(value, 0x001a001a, 'UINT24_LE sequential peek #2');
          assert.strictEqual(tokenizer.position, 0);
          value = await tokenizer.readToken(Token.UINT32_LE);

          assert.ok(typeof value === 'number');
          assert.equal(value, 0x001a001a, 'UINT24_LE #3');
          assert.strictEqual(tokenizer.position, 4);
          value = await tokenizer.readToken(Token.UINT32_BE);
          assert.ok(typeof value === 'number');
          assert.equal(value, 0x1a001a00, 'UINT32_BE #4');
          assert.strictEqual(tokenizer.position, 8);
          value = await tokenizer.readToken(Token.UINT32_LE);

          assert.ok(typeof value === 'number');
          assert.equal(value, 0x001a001a, 'UINT32_LE #5');
          assert.strictEqual(tokenizer.position, 12);
          value = await tokenizer.readToken(Token.UINT32_BE);

          assert.ok(typeof value === 'number');
          assert.equal(value, 0x1a001a00, 'UINT32_BE #6');
          assert.strictEqual(tokenizer.position, 16);

        }

        const rst = await tokenizerType.loadTokenizer('test1.dat');

        if (rst instanceof FileTokenizer) {
          assert.equal(rst.fileSize, 16, 'check file size property');
        }
        await peekOnData(rst);
        await rst.close();
      });

      it('Overlapping peeks', async () => {

        const rst = await getTokenizerWithData('\x01\x02\x03\x04\x05', tokenizerType);
        const peekBuffer = Buffer.alloc(3);
        const readBuffer = Buffer.alloc(1);

        assert.equal(0, rst.position);
        let len = await rst.peekBuffer(peekBuffer, 0, 3); // Peek #1
        assert.equal(3, len);
        assert.deepEqual(peekBuffer, Buffer.from('\x01\x02\x03', 'binary'), 'Peek #1');
        assert.equal(rst.position, 0);
        len = await rst.readBuffer(readBuffer, 0, 1); // Read #1
        assert.equal(len, 1);
        assert.equal(rst.position, 1);
        assert.deepEqual(readBuffer, Buffer.from('\x01', 'binary'), 'Read #1');
        len = await rst.peekBuffer(peekBuffer, 0, 3); // Peek #2
        assert.equal(len, 3);
        assert.equal(rst.position, 1);
        assert.deepEqual(peekBuffer, Buffer.from('\x02\x03\x04', 'binary'), 'Peek #2');
        len = await rst.readBuffer(readBuffer, 0, 1); // Read #2
        assert.equal(len, 1);
        assert.equal(rst.position, 2);
        assert.deepEqual(readBuffer, Buffer.from('\x02', 'binary'), 'Read #2');
        len = await rst.peekBuffer(peekBuffer, 0, 3); // Peek #3
        assert.equal(len, 3);
        assert.equal(rst.position, 2);
        assert.deepEqual(peekBuffer, Buffer.from('\x03\x04\x05', 'binary'), 'Peek #3');
        len = await rst.readBuffer(readBuffer, 0, 1); // Read #3
        assert.equal(len, 1);
        assert.equal(rst.position, 3);
        assert.deepEqual(readBuffer, Buffer.from('\x03', 'binary'), 'Read #3');
        len = await rst.peekBuffer(peekBuffer, 0, 2); // Peek #4
        assert.equal(len, 2, '3 bytes requested to peek, only 2 bytes left');
        assert.equal(rst.position, 3);
        assert.deepEqual(peekBuffer, Buffer.from('\x04\x05\x05', 'binary'), 'Peek #4');
        len = await rst.readBuffer(readBuffer, 0, 1); // Read #4
        assert.equal(len, 1);
        assert.equal(rst.position, 4);
        assert.deepEqual(readBuffer, Buffer.from('\x04', 'binary'), 'Read #4');

        await rst.close();
      });

      it('should be able to read at position ahead', async () => {

        const rst = await getTokenizerWithData('\x05peter', tokenizerType);
        // should decode string from chunk
        assert.strictEqual(rst.position, 0);
        let value = await rst.readToken(new Token.StringType(5, 'utf-8'), 1);
        assert.ok(typeof value === 'string');
        assert.equal(value, 'peter');
        assert.strictEqual(rst.position, 6);
        // should should reject at the end of the stream
        try {
          await rst.readToken(Token.UINT8);
          assert.fail('Should reject due to end-of-stream');
        } catch (err) {
          assert.equal(err.message, endOfFile);
        }
      });

      it('should be able to peek at position ahead', async () => {

        const rst = await getTokenizerWithData('\x05peter', tokenizerType);
        // should decode string from chunk
        assert.strictEqual(rst.position, 0);
        let value = await rst.peekToken(new Token.StringType(5, 'utf-8'), 1);
        assert.ok(typeof value === 'string');
        assert.equal(value, 'peter');
        assert.strictEqual(rst.position, 0);
      });

      it('number', async () => {
        const tokenizer = await tokenizerType.loadTokenizer('test3.dat');
        await tokenizer.ignore(tokenizer.fileSize - 4);
        const x = await tokenizer.peekNumber(Token.INT32_BE);
        assert.strictEqual(x, 33752069);
      });

      it('should throw an Error if we reach EOF while peeking a number', async () => {
        const tokenizer = await tokenizerType.loadTokenizer('test3.dat');
        await tokenizer.ignore(tokenizer.fileSize - 3);
        try {
          const x = await tokenizer.peekNumber(Token.INT32_BE);
          assert.fail('Should throw Error: End-Of-File');
        } catch (err) {
          assert.strictEqual(err.message, 'End-Of-File');
        }
        await tokenizer.close();
      });

      it('should be able to handle multiple ignores', async () => {
        const tokenizer = await tokenizerType.loadTokenizer('test1.dat');
        let value = await tokenizer.readToken(Token.UINT32_LE);
        assert.ok(typeof value === 'number');
        assert.equal(value, 0x001a001a, 'UINT24_LE #1');
        await tokenizer.ignore(Token.UINT32_BE.len);
        await tokenizer.ignore(Token.UINT32_LE.len);
        value = await tokenizer.readToken(Token.UINT32_BE);
        assert.ok(typeof value === 'number');
        assert.equal(value, 0x1a001a00, 'UINT32_BE #4');
        await tokenizer.close();
      });

      it('should be able to ignore (skip)', async () => {

        const tokenizer = await tokenizerType.loadTokenizer('test1.dat');
        assert.strictEqual(tokenizer.position, 0);
        await tokenizer.ignore(4);
        assert.strictEqual(tokenizer.position, 4);
        let value = await tokenizer.readToken(Token.UINT32_BE);
        assert.ok(typeof value === 'number');
        assert.equal(value, 0x1a001a00, 'UINT32_BE #2');
        value = await tokenizer.readToken(Token.UINT32_LE);
        assert.ok(typeof value === 'number');
        assert.equal(value, 0x001a001a, 'UINT32_LE #3');
        value = await tokenizer.readToken(Token.UINT32_BE);
        assert.ok(typeof value === 'number');
        assert.equal(value, 0x1a001a00, 'UINT32_BE #4');
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
          const buf = Buffer.alloc(stat.size);
          const bytesRead = await tokenizer.readBuffer(buf);
          assert.ok(typeof bytesRead === 'number', 'readBuffer promise should provide a number');
          assert.equal(stat.size, bytesRead);
          try {
            await tokenizer.readBuffer(buf);
            assert.fail('Should throw EOF');
          } catch (err) {
            assert.equal(err.message, endOfFile);
          }
        });

        it('should not throw an Error if we read exactly until the end of the file', async () => {

          const rst = await getTokenizerWithData('\x89\x54\x40', tokenizerType);
          const num = await rst.readToken(Token.UINT24_BE);
          assert.strictEqual(num, 9000000);
        });

        it('should be thrown if a token EOF reached in the middle of a token', async () => {

          const rst = await getTokenizerWithData('\x89\x54\x40', tokenizerType);
          try {
            await rst.readToken(Token.INT32_BE);
            assert.fail('It should throw EndOfFile Error');
          } catch (err) {
            assert.equal(err.message, endOfFile);
          }
        });

        it('should throw an EOF if we read to buffer', async () => {

          const buffer = Buffer.alloc(4);

          return getTokenizerWithData('\x89\x54\x40', tokenizerType).then(rst => {
            return rst.readBuffer(buffer).then(len => {
              assert.fail('It should throw EndOfFile Error');
            }).catch(err => {
              assert.strictEqual(err.message, endOfFile);
            });
          });
        });

        it('should throw an EOF if we peek to buffer', async () => {

          const buffer = Buffer.alloc(4);
          const rst = await getTokenizerWithData('\x89\x54\x40', tokenizerType);
          try {
            const len = await rst.peekBuffer(buffer);
            assert.fail('It should throw EndOfFile Error');
          } catch (err) {
            assert.strictEqual(err.message, endOfFile);
          }
        });

        it('should not throw an EOF if we peek to buffer with maybeLess=true', async () => {

          const buffer = Buffer.alloc(4);
          const rst = await getTokenizerWithData('\x89\x54\x40', tokenizerType);
          const len = await rst.peekBuffer(buffer, 0, buffer.length, rst.position, true);
          assert.strictEqual(len, 3, 'should return 3 because no more bytes are available');
        });

      });

      it('should be able to read from a file', async () => {

        const tokenizer = await tokenizerType.loadTokenizer('test1.dat');
        assert.equal(tokenizer.fileSize, 16, 'check file size property');
        let value = await tokenizer.readToken(Token.UINT32_LE);
        assert.ok(typeof value === 'number');
        assert.equal(value, 0x001a001a, 'UINT24_LE #1');
        value = await tokenizer.readToken(Token.UINT32_BE);
        assert.ok(typeof value === 'number');
        assert.equal(value, 0x1a001a00, 'UINT32_BE #2');
        value = await tokenizer.readToken(Token.UINT32_LE);
        assert.ok(typeof value === 'number');
        assert.equal(value, 0x001a001a, 'UINT32_LE #3');
        value = await tokenizer.readToken(Token.UINT32_BE);
        assert.ok(typeof value === 'number');
        assert.equal(value, 0x1a001a00, 'UINT32_BE #4');
      });

      it('should be able to parse the IgnoreType-token', async () => {
        const tokenizer = await tokenizerType.loadTokenizer('test1.dat');
        await tokenizer.readToken(new Token.IgnoreType(4));
        let value = await tokenizer.readToken(Token.UINT32_BE);
        assert.ok(typeof value === 'number');
        assert.equal(value, 0x1a001a00, 'UINT32_BE #2');
        value = await tokenizer.readToken(Token.UINT32_LE);
        assert.ok(typeof value === 'number');
        assert.equal(value, 0x001a001a, 'UINT32_LE #3');
        value = await tokenizer.readToken(Token.UINT32_BE);
        assert.ok(typeof value === 'number');
        assert.equal(value, 0x1a001a00, 'UINT32_BE #4');
      });

      it('should be able to read 0 bytes from a file', async () => {
        const bufZero = Buffer.alloc(0);
        const tokenizer = await tokenizerType.loadTokenizer('test1.dat');
        await tokenizer.readBuffer(bufZero);
      });

    }); // End of test "Tokenizer-types"

  });

});
