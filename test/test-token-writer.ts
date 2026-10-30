import { assert } from 'chai';
import * as Token from 'token-types';
import { BufferSizeError, fromBuffer, type IToken, TokenWriter } from '../lib/index.js';

describe('TokenWriter', () => {
  it('validates the optional output cap before allocating the initial buffer', () => {
    for (const limit of [0, -1, 1.5, Number.NaN, Number.NEGATIVE_INFINITY, 2 ** 53]) {
      assert.throws(() => new TokenWriter(0, { maxBufferSize: limit }), RangeError, 'maxBufferSize');
    }
    assert.throws(() => new TokenWriter(Number.MAX_SAFE_INTEGER, { maxBufferSize: 4 }), BufferSizeError);
    assert.throws(() => new TokenWriter(-1, { maxBufferSize: 4 }), RangeError, 'initialCapacity');
    assert.throws(() => new TokenWriter(1.5, { maxBufferSize: 4 }), RangeError, 'initialCapacity');
    for (const limit of [undefined, Number.POSITIVE_INFINITY]) {
      const writer = new TokenWriter(1, { maxBufferSize: limit });
      writer.writeZeros(2048);
      assert.strictEqual(writer.length, 2048);
    }
  });

  it('honors tiny caps and accepts exact-limit output and empty operations', () => {
    for (const initialCapacity of [undefined, 0, 1]) {
      const writer = new TokenWriter(initialCapacity, { maxBufferSize: 1 });
      writer.writeToken(
        {
          len: 1,
          get: () => 0,
          put: (data, offset, value: number) => {
            assert.strictEqual(data.length, 1);
            return Token.UINT8.put(data, offset, value);
          }
        },
        42
      );
      assert.strictEqual(writer.reserve(0), 1);
      assert.strictEqual(writer.writeBuffer(new Uint8Array()), 0);
      assert.strictEqual(writer.writeZeros(0), 0);
      writer.patchToken(Token.UINT8, 0, 7);
      assert.deepEqual(writer.toUint8Array(), Uint8Array.of(7));
      assert.throws(() => writer.reserve(1), BufferSizeError);
      assert.strictEqual(writer.length, 1);
    }
  });

  it('bounds growth without rejecting valid output when doubling would exceed the cap', () => {
    const writer = new TokenWriter(0, { maxBufferSize: 17 });
    writer.writeBuffer(new Uint8Array(16).fill(42));
    let encoderCapacity = 0;
    const token: IToken<number> = {
      len: 1,
      get: () => 0,
      put: (data, offset, value) => {
        encoderCapacity = data.length;
        data[offset] = value;
        return offset + 1;
      }
    };
    assert.strictEqual(writer.writeToken(token, 7), 1);
    assert.strictEqual(encoderCapacity, 17);
    assert.deepEqual(writer.toUint8Array(), Uint8Array.from([...new Uint8Array(16).fill(42), 7]));
  });

  it('rejects every over-limit append before encoding and preserves output for reuse', () => {
    const writer = new TokenWriter(1, { maxBufferSize: 7 });
    writer.writeBuffer(Uint8Array.of(1, 2, 3));
    const token: IToken<number> = {
      len: 5,
      get: () => 0,
      put: () => assert.fail('Over-limit append must be rejected before encoding')
    };
    const operations = [
      () => writer.reserve(5),
      () => writer.writeZeros(5),
      () => writer.writeBuffer(new Uint8Array(5)),
      () => writer.writeBytes(new Uint8Array(5)),
      () => writer.writeToken(token, 0)
    ];
    for (const operation of operations) {
      try {
        operation();
        assert.fail('Expected BufferSizeError');
      } catch (error) {
        assert.instanceOf(error, BufferSizeError);
        assert.strictEqual((error as BufferSizeError).requestedSize, 8);
        assert.strictEqual((error as BufferSizeError).maxBufferSize, 7);
      }
      assert.strictEqual(writer.length, 3);
      assert.deepEqual(writer.toUint8Array(), Uint8Array.of(1, 2, 3));
    }
    assert.throws(() => writer.reserve(Number.MAX_SAFE_INTEGER), RangeError, 'required capacity');
    writer.writeZeros(4);
    assert.deepEqual(writer.toUint8Array(), Uint8Array.of(1, 2, 3, 0, 0, 0, 0));
  });

  it('writes tokens in order and grows from a small initial capacity', async () => {
    const writer = new TokenWriter(1);
    writer.writeToken(Token.UINT8, 0xab);
    writer.writeToken(Token.UINT16_BE, 0x1234);
    writer.writeToken(Token.UINT24_BE, 0x56789a);
    writer.writeToken(Token.UINT32_BE, 0xbcdef012);
    writer.writeToken(Token.UINT32_LE, 0x3456789a);
    writer.writeToken(Token.UINT32_BE, 0x01020304);

    const data = writer.toUint8Array();
    assert.deepEqual(
      Array.from(data),
      [0xab, 0x12, 0x34, 0x56, 0x78, 0x9a, 0xbc, 0xde, 0xf0, 0x12, 0x9a, 0x78, 0x56, 0x34, 1, 2, 3, 4]
    );
    assert.strictEqual(writer.length, data.length);

    const tokenizer = fromBuffer(data);
    try {
      assert.strictEqual(await tokenizer.readToken(Token.UINT8), 0xab);
      assert.strictEqual(await tokenizer.readToken(Token.UINT16_BE), 0x1234);
      assert.strictEqual(await tokenizer.readToken(Token.UINT24_BE), 0x56789a);
      assert.strictEqual(await tokenizer.readToken(Token.UINT32_BE), 0xbcdef012);
      assert.strictEqual(await tokenizer.readToken(Token.UINT32_LE), 0x3456789a);
      assert.strictEqual(await tokenizer.readToken(Token.UINT32_BE), 0x01020304);
    } finally {
      await tokenizer.close();
    }
  });

  it('preserves data and patch offsets across repeated growth and a large append', () => {
    const writer = new TokenWriter(0);
    const header = writer.reserve(4);
    const payload = Uint8Array.from({ length: 100 }, (_, index) => index);

    assert.strictEqual(writer.writeBuffer(payload), 100);
    const snapshot = writer.toUint8Array();
    assert.strictEqual(writer.writeZeros(200), 200);
    writer.patchToken(Token.UINT32_BE, header, payload.length);

    assert.strictEqual(writer.length, 304);
    assert.deepEqual(writer.toUint8Array(), Uint8Array.from([0, 0, 0, 100, ...payload, ...new Uint8Array(200)]));
    assert.deepEqual(snapshot, Uint8Array.from([0, 0, 0, 0, ...payload]));
  });

  it('accepts empty operations and patches ending exactly at the written boundary', () => {
    const writer = new TokenWriter(16);
    assert.strictEqual(writer.length, 0);
    assert.deepEqual(writer.toUint8Array(), new Uint8Array());
    assert.strictEqual(writer.reserve(0), 0);
    assert.strictEqual(writer.writeBytes(new Uint8Array()), 0);
    assert.strictEqual(writer.writeZeros(0), 0);

    assert.strictEqual(writer.writeBytes(new Uint8Array(16)), 16);
    writer.patchToken(Token.UINT16_BE, 14, 0x1234);
    assert.strictEqual(writer.reserve(0), 16);
    assert.strictEqual(writer.writeZeros(0), 0);
    assert.strictEqual(writer.writeBytes(new Uint8Array()), 0);
    assert.deepEqual(writer.toUint8Array(), Uint8Array.from([...new Uint8Array(14), 0x12, 0x34]));
  });

  it('reserves and patches a token at an earlier offset', () => {
    const writer = new TokenWriter(2);
    const offset = writer.reserve(4);
    writer.writeZeros(4);
    writer.patchToken(Token.UINT32_BE, offset, 0x01020304);

    assert.deepEqual(Array.from(writer.toUint8Array()), [1, 2, 3, 4, 0, 0, 0, 0]);
    assert.strictEqual(writer.length, 8);
  });

  it('writes raw bytes and zero padding', () => {
    const writer = new TokenWriter();
    writer.writeBytes(Uint8Array.from([1, 2]));
    writer.writeZeros(3);
    writer.writeBytes(Uint8Array.from([4]));

    assert.deepEqual(Array.from(writer.toUint8Array()), [1, 2, 0, 0, 0, 4]);
  });

  it('copies written bytes and returns an independent snapshot', () => {
    const source = Uint8Array.from([1, 2, 3]);
    const writer = new TokenWriter();
    writer.writeBytes(source);

    source[0] = 9;
    const snapshot = writer.toUint8Array();
    snapshot[1] = 8;

    assert.deepEqual(Array.from(writer.toUint8Array()), [1, 2, 3]);
  });

  it('supports custom token encoders', () => {
    const customToken: IToken<string> = {
      len: 2,
      get: (data, offset) => String.fromCharCode(data[offset] ?? 0, data[offset + 1] ?? 0),
      put: (data, offset, value) => {
        data[offset] = value.charCodeAt(0);
        data[offset + 1] = value.charCodeAt(1);
        return offset + 2;
      }
    };

    const writer = new TokenWriter();
    writer.writeToken(customToken, 'AB');
    assert.deepEqual(Array.from(writer.toUint8Array()), [65, 66]);
  });

  it('rejects invalid capacities, lengths and patch ranges', () => {
    assert.throws(() => new TokenWriter(-1), RangeError);
    assert.throws(() => new TokenWriter(1.5), RangeError);

    const writer = new TokenWriter();
    assert.throws(() => writer.reserve(-1), RangeError);
    assert.throws(() => writer.reserve(1.5), RangeError);
    assert.throws(() => writer.writeZeros(-1), RangeError);
    assert.throws(() => writer.patchToken(Token.UINT32_BE, 0, 1), RangeError);

    writer.writeToken(Token.UINT8, 1);
    assert.throws(() => writer.patchToken(Token.UINT32_BE, 0, 1), RangeError);
    assert.throws(() => writer.patchToken(Token.UINT8, -1, 1), RangeError);
  });

  it('rejects non-finite and unsafe lengths before invoking an encoder or changing output', () => {
    const writer = new TokenWriter();
    writer.writeToken(Token.UINT8, 42);
    const invalidValues = [-1, 1.5, Number.NaN, Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY, 2 ** 53];
    const token: IToken<number> = {
      len: 1,
      get: () => 0,
      put: () => assert.fail('Invalid token range must be rejected before encoding')
    };

    for (const value of invalidValues) {
      assert.throws(() => new TokenWriter(value), RangeError);
      assert.throws(() => writer.reserve(value), RangeError);
      assert.throws(() => writer.writeZeros(value), RangeError);
      assert.throws(() => writer.patchToken(token, value, 0), RangeError);
      token.len = value;
      assert.throws(() => writer.writeToken(token, 0), RangeError);
      assert.throws(() => writer.patchToken(token, 0, 0), RangeError);
      token.len = 1;
    }

    assert.throws(() => writer.reserve(Number.MAX_SAFE_INTEGER), RangeError, 'required capacity');
    assert.throws(() => writer.patchToken(token, Number.MAX_SAFE_INTEGER, 0), RangeError, 'Invalid patch range');
    assert.strictEqual(writer.length, 1);
    assert.deepEqual(writer.toUint8Array(), Uint8Array.of(42));
  });

  it('returns byte counts from append operations at a nonzero position', () => {
    const writer = new TokenWriter();
    writer.reserve(5);
    assert.strictEqual(writer.writeToken(Token.UINT16_BE, 0x1234), 2);
    assert.strictEqual(writer.writeBuffer(Uint8Array.of(1, 2, 3)), 3);
    assert.strictEqual(writer.writeBytes(Uint8Array.of(4)), 1);
    assert.strictEqual(writer.writeZeros(2), 2);
    assert.strictEqual(writer.reserve(2), 13);
    assert.strictEqual(writer.length, 15);
    assert.deepEqual(writer.toUint8Array(), Uint8Array.from([0, 0, 0, 0, 0, 0x12, 0x34, 1, 2, 3, 4, 0, 0, 0, 0]));
  });

  it('rolls back partially encoded appends and clears bytes before reuse', () => {
    const writer = new TokenWriter(16);
    writer.writeBytes(new Uint8Array(15).fill(7));
    const before = writer.toUint8Array();
    const error = new RangeError('Invalid token value');
    const token: IToken<number> = {
      len: 3,
      get: () => 0,
      put: (data, offset) => {
        data.fill(0xab, offset, offset + 3);
        throw error;
      }
    };

    assert.throws(() => writer.writeToken(token, 0), error);
    assert.strictEqual(writer.length, 15);
    assert.deepEqual(writer.toUint8Array(), before);
    assert.strictEqual(writer.writeToken(Token.UINT8, 42), 1);
    assert.strictEqual(writer.reserve(2), 16);
    assert.deepEqual(writer.toUint8Array(), Uint8Array.from([...before, 42, 0, 0]));
  });

  it('restores a partially encoded patch without changing surrounding data', () => {
    const writer = new TokenWriter();
    writer.writeBytes(Uint8Array.of(1, 2, 3, 4));
    const before = writer.toUint8Array();
    const error = new RangeError('Invalid patch value');
    const token: IToken<number> = {
      len: 2,
      get: () => 0,
      put: (data, offset) => {
        data[offset] = 99;
        throw error;
      }
    };

    assert.throws(() => writer.patchToken(token, 1, 0), error);
    assert.strictEqual(writer.length, 4);
    assert.deepEqual(writer.toUint8Array(), before);
    writer.patchToken(Token.UINT16_BE, 1, 0x0506);
    assert.deepEqual(writer.toUint8Array(), Uint8Array.of(1, 5, 6, 4));
  });

  it('propagates encoder errors for appended and patched tokens', () => {
    const error = new RangeError('Invalid token value');
    const token: IToken<number> = {
      len: 1,
      get: () => 0,
      put: () => {
        throw error;
      }
    };
    const writer = new TokenWriter();
    writer.reserve(1);

    assert.throws(() => writer.writeToken(token, 0), error);
    assert.strictEqual(writer.length, 1);
    assert.deepEqual(writer.toUint8Array(), Uint8Array.of(0));
    assert.throws(() => writer.patchToken(token, 0, 0), error);
    assert.strictEqual(writer.length, 1);
    assert.deepEqual(writer.toUint8Array(), Uint8Array.of(0));
  });
});
