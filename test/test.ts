import * as Token from "token-types";
import {} from "mocha";
import {assert} from 'chai';
import {SourceStream} from "./util";
import * as strtok3 from "../src";
import * as Path from 'path';
import * as fs from "fs-extra";

describe("ReadStreamTokenizer", () => {

  describe("buffer", () => {

    const ss = new SourceStream('\x05peter');
    return strtok3.fromStream(ss).then((rst) => {

      it("should decode UINT8 from chunk", () => {

        return rst.readToken<number>(Token.UINT8).then((value) => {
          assert.ok(typeof value === 'number');
          assert.equal(value, 5, "0x05 == 5");
        });
      });

      it("should decode string from chunk", () => {

        return rst.readToken<string>(new Token.StringType(5, 'utf-8')).then((value) => {
          assert.ok(typeof value === 'string');
          assert.equal(value, 'peter', "0x05 == 5");
        });
      });

      it("should should reject at the end of the stream", () => {

        return rst.readToken<number>(Token.UINT8).then(() => {
          assert.fail("Should reject due to end-of-stream");
        }).catch((err) => {
          assert.equal(err, strtok3.EndOfFile);
        });
      });
    });
  });

  it("should contain fileSize if constructed from file-read-stream", () => {

    // ToDo

    const fileReadStream = fs.createReadStream(Path.join(__dirname, 'resources', 'test1.dat'));
    return strtok3.fromStream(fileReadStream).then((rst) => {
      assert.equal(rst.fileSize, 16, " ReadStreamTokenizer.fileSize");
      fileReadStream.close();
    });
  });

  describe("Parsing binary numbers", () => {

    it("should encode signed 8-bit integer (INT8)", () => {

      const b = new Buffer(1);

      Token.INT8.put(b, 0, 0x00);
      assert.strictEqual(b.toString('binary'), '\x00');

      Token.INT8.put(b, 0, 0x22);
      assert.strictEqual(b.toString('binary'), '\x22');

      Token.INT8.put(b, 0, -0x22);
      assert.strictEqual(b.toString('binary'), '\xde');
    });

    it("should decode signed 8-bit integer (INT8)", () => {

      const ss = new SourceStream('\x00\x7f\x80\xff\x81');
      return strtok3.fromStream(ss).then((rst) => {

        return rst.readToken<number>(Token.INT8)
          .then((value) => {
            assert.ok(typeof value === 'number');
            assert.equal(value, 0, "INT8 #1 == 0");
            return rst.readToken<number>(Token.INT8);
          }).then((value) => {
            assert.ok(typeof value === 'number');
            assert.equal(value, 127, "INT8 #2 == 127");
            return rst.readToken<number>(Token.INT8);
          }).then((value) => {
            assert.ok(typeof value === 'number');
            assert.equal(value, -128, "INT8 #3 == -128");
            return rst.readToken<number>(Token.INT8);
          }).then((value) => {
            assert.ok(typeof value === 'number');
            assert.equal(value, -1, "INT8 #4 == -1");
            return rst.readToken<number>(Token.INT8);
          }).then((value) => {
            assert.ok(typeof value === 'number');
            assert.equal(value, -127, "INT8 #5 == -127");
          });
      });
    });

    it("should encode signed 16-bit big-endian integer (INT16_BE)", () => {

      const b = new Buffer(2);

      Token.INT16_BE.put(b, 0, 0x00);
      assert.strictEqual(b.toString('binary'), '\x00\x00');

      Token.INT16_BE.put(b, 0, 0x0f0b);
      assert.strictEqual(b.toString('binary'), '\x0f\x0b');

      Token.INT16_BE.put(b, 0, -0x0f0b);
      assert.strictEqual(b.toString('binary'), '\xf0\xf5');
    });

    it("should decode signed 16-bit big-endian integer (INT16_BE)", () => {

      const ss = new SourceStream('\x0a\x1a\x00\x00\xff\xff\x80\x00');
      return strtok3.fromStream(ss).then((rst) => {

        return rst.readToken<number>(Token.INT16_BE)
          .then((value) => {
            assert.ok(typeof value === 'number');
            assert.equal(value, 2586, "INT16_BE#1");
            return rst.readToken<number>(Token.INT16_BE);
          }).then((value) => {
            assert.ok(typeof value === 'number');
            assert.equal(value, 0, "INT16_BE#2");
            return rst.readToken<number>(Token.INT16_BE);
          }).then((value) => {
            assert.ok(typeof value === 'number');
            assert.equal(value, -1, "INT16_BE#3");
            return rst.readToken<number>(Token.INT16_BE);
          }).then((value) => {
            assert.ok(typeof value === 'number');
            assert.equal(value, -32768, "INT16_BE#4");
          });
      });
    });

    it("should encode signed 24-bit big-endian integer (INT24_BE)", () => {

      const b = new Buffer(3);

      Token.INT24_BE.put(b, 0, 0x00);
      assert.strictEqual(b.toString('binary'), '\x00\x00\x00');

      Token.INT24_BE.put(b, 0, 0x0f0ba0);
      assert.strictEqual(b.toString('binary'), '\x0f\x0b\xa0');

      Token.INT24_BE.put(b, 0, -0x0f0bcc);
      assert.strictEqual(b.toString('binary'), '\xf0\xf4\x34');
    });

    it("should decode signed 24-bit big-endian integer (INT24_BE)", () => {

      const ss = new SourceStream('\x00\x00\x00\xff\xff\xff\x10\x00\xff\x80\x00\x00');
      return strtok3.fromStream(ss).then((rst) => {

        return rst.readToken<number>(Token.INT24_BE)
          .then((value) => {
            assert.ok(typeof value === 'number');
            assert.equal(value, 0, "INT24_BE#1");
            return rst.readToken<number>(Token.INT24_BE);
          }).then((value) => {
            assert.ok(typeof value === 'number');
            assert.equal(value, -1, "INT24_BE#2");
            return rst.readToken<number>(Token.INT24_BE);
          }).then((value) => {
            assert.ok(typeof value === 'number');
            assert.equal(value, 1048831, "INT24_BE#3");
            return rst.readToken<number>(Token.INT24_BE);
          }).then((value) => {
            assert.ok(typeof value === 'number');
            assert.equal(value, -8388608, "INT24_BE#4");
          });
      });
    });

    // ToDo: test decoding: INT24_LE

    it("should encode signed 32-bit big-endian integer (INT32_BE)", () => {

      const b = new Buffer(4);

      Token.INT32_BE.put(b, 0, 0x00);
      assert.strictEqual(b.toString('binary'), '\x00\x00\x00\x00');

      Token.INT32_BE.put(b, 0, 0x0f0bcca0);
      assert.strictEqual(b.toString('binary'), '\x0f\x0b\xcc\xa0');

      Token.INT32_BE.put(b, 0, -0x0f0bcca0);
      assert.strictEqual(b.toString('binary'), '\xf0\xf4\x33\x60');
    });

    it("should decode signed 32-bit big-endian integer (INT32_BE)", () => {

      const ss = new SourceStream('\x00\x00\x00\x00\xff\xff\xff\xff\x00\x10\x00\xff\x80\x00\x00\x00');
      return strtok3.fromStream(ss).then((rst) => {

        return rst.readToken<number>(Token.INT32_BE)
          .then((value) => {
            assert.ok(typeof value === 'number');
            assert.equal(value, 0, "INT24_BE #1");
            return rst.readToken<number>(Token.INT32_BE);
          }).then((value) => {
            assert.ok(typeof value === 'number');
            assert.equal(value, -1, "INT32_BE #2");
            return rst.readToken<number>(Token.INT32_BE);
          }).then((value) => {
            assert.ok(typeof value === 'number');
            assert.equal(value, 1048831, "INT32_BE #3");
            return rst.readToken<number>(Token.INT32_BE);
          }).then((value) => {
            assert.ok(typeof value === 'number');
            assert.equal(value, -2147483648, "INT32_BE #4");
          });
      });
    });

    it("should encode signed 8-bit big-endian integer (INT8)", () => {

      const b = new Buffer(1);

      Token.UINT8.put(b, 0, 0x00);
      assert.strictEqual(b.toString('binary'), '\x00');

      Token.UINT8.put(b, 0, 0xff);
      assert.strictEqual(b.toString('binary'), '\xff');
    });

    it("should decode unsigned 8-bit big-endian integer (UINT8)", () => {

      const ss = new SourceStream('\x00\x1a\xff');
      return strtok3.fromStream(ss).then((rst) => {

        return rst.readToken<number>(Token.UINT8)
          .then((value) => {
            assert.ok(typeof value === 'number');
            assert.equal(value, 0, "UINT8 #1");
            return rst.readToken<number>(Token.UINT8);
          }).then((value) => {
            assert.ok(typeof value === 'number');
            assert.equal(value, 26, "UINT8 #2");
            return rst.readToken<number>(Token.UINT8);
          }).then((value) => {
            assert.ok(typeof value === 'number');
            assert.equal(value, 255, "UINT8 #3");
          });
      });
    });

    it("should encode unsigned 16-bit big-endian integer (UINT16_LE)", () => {

      const b = new Buffer(4);

      Token.UINT16_LE.put(b, 0, 0x00);
      Token.UINT16_LE.put(b, 2, 0xffaa);
      assert.strictEqual(b.toString('binary'), '\x00\x00\xaa\xff');
    });

    it("should encode unsigned 16-bit little-endian integer (UINT16_BE)", () => {
      const b = new Buffer(4);
      Token.UINT16_BE.put(b, 0, 0xf);
      Token.UINT16_BE.put(b, 2, 0xffaa);
      assert.strictEqual(b.toString('binary'), '\x00\x0f\xff\xaa');
    });

    it("should encode unsigned 16-bit mixed little/big-endian integers", () => {
      const b = new Buffer(4);
      Token.UINT16_BE.put(b, 0, 0xffaa);
      Token.UINT16_LE.put(b, 2, 0xffaa);
      assert.strictEqual(b.toString('binary'), '\xff\xaa\xaa\xff');
    });

    it("should decode unsigned mixed 16-bit big/little-endian integer", () => {

      const ss = new SourceStream('\x1a\x00\x1a\x00\x1a\x00\x1a\x00');
      return strtok3.fromStream(ss).then((rst) => {

        return rst.readToken<number>(Token.UINT16_LE)
          .then((value) => {
            assert.ok(typeof value === 'number');
            assert.equal(value, 0x001a, "UINT16_LE #1");
            return rst.readToken<number>(Token.UINT16_BE);
          }).then((value) => {
            assert.ok(typeof value === 'number');
            assert.equal(value, 0x1a00, "UINT16_BE #2");
            return rst.readToken<number>(Token.UINT16_LE);
          }).then((value) => {
            assert.ok(typeof value === 'number');
            assert.equal(value, 0x001a, "UINT16_BE #3");
            return rst.readToken<number>(Token.UINT16_BE);
          }).then((value) => {
            assert.ok(typeof value === 'number');
            assert.equal(value, 0x1a00, "UINT16_LE #4");
          });
      });
    });

    it("should encode unsigned 24-bit little-endian integer (UINT24_LE)", () => {

      const b = new Buffer(3);

      Token.UINT24_LE.put(b, 0, 0x00);
      assert.strictEqual(b.toString('binary'), '\x00\x00\x00');

      Token.UINT24_LE.put(b, 0, 0xff);
      assert.strictEqual(b.toString('binary'), '\xff\x00\x00');

      Token.UINT24_LE.put(b, 0, 0xaabbcc);
      assert.strictEqual(b.toString('binary'), '\xcc\xbb\xaa');
    });

    it("should encode unsigned 24-bit big-endian integer (UINT24_BE)", () => {

      const b = new Buffer(3);

      Token.UINT24_BE.put(b, 0, 0x00);
      assert.strictEqual(b.toString('binary'), '\x00\x00\x00');

      Token.UINT24_BE.put(b, 0, 0xff);
      assert.strictEqual(b.toString('binary'), '\x00\x00\xff');

      Token.UINT24_BE.put(b, 0, 0xaabbcc);
      assert.strictEqual(b.toString('binary'), '\xaa\xbb\xcc');
    });

    it("should decode signed 24-bit big/little-endian integer (UINT24_LE/INT24_BE)", () => {

      const ss = new SourceStream('\x1a\x1a\x00\x1a\x1a\x00\x1a\x1a\x00\x1a\x1a\x00');
      return strtok3.fromStream(ss).then((rst) => {

        return rst.readToken<number>(Token.UINT24_LE)
          .then((value) => {
            assert.ok(typeof value === 'number');
            assert.equal(value, 0x001a1a, "INT24_LE#1");
            return rst.readToken<number>(Token.UINT24_BE);
          }).then((value) => {
            assert.ok(typeof value === 'number');
            assert.equal(value, 0x1a1a00, "INT24_BE#2");
            return rst.readToken<number>(Token.UINT24_LE);
          }).then((value) => {
            assert.ok(typeof value === 'number');
            assert.equal(value, 0x001a1a, "INT24_LE#3");
            return rst.readToken<number>(Token.UINT24_BE);
          }).then((value) => {
            assert.ok(typeof value === 'number');
            assert.equal(value, 0x1a1a00, "INT24_BE#4");
          });
      });
    });

    it("should encode unsigned 32-bit little-endian integer (UINT32_LE)", () => {

      const b = new Buffer(4);

      Token.UINT32_LE.put(b, 0, 0x00);
      assert.strictEqual(b.toString('binary'), '\x00\x00\x00\x00');

      Token.UINT32_LE.put(b, 0, 0xff);
      assert.strictEqual(b.toString('binary'), '\xff\x00\x00\x00');

      Token.UINT32_LE.put(b, 0, 0xaabbccdd);
      assert.strictEqual(b.toString('binary'), '\xdd\xcc\xbb\xaa');
    });

    it("should encode unsigned 32-bit big-endian integer (INT32_BE)", () => {

      const b = new Buffer(4);

      Token.UINT32_BE.put(b, 0, 0x00);
      assert.strictEqual(b.toString('binary'), '\x00\x00\x00\x00');

      Token.UINT32_BE.put(b, 0, 0xff);
      assert.strictEqual(b.toString('binary'), '\x00\x00\x00\xff');

      Token.UINT32_BE.put(b, 0, 0xaabbccdd);
      assert.strictEqual(b.toString('binary'), '\xaa\xbb\xcc\xdd');
    });

    it("should decode unsigned 32-bit little/big-endian integer (UINT32_LE/UINT32_BE)", () => {

      const ss = new SourceStream('\x1a\x00\x1a\x00\x1a\x00\x1a\x00\x1a\x00\x1a\x00\x1a\x00\x1a\x00');
      return strtok3.fromStream(ss).then((rst) => {

        return rst.readToken<number>(Token.UINT32_LE)
          .then((value) => {
            assert.ok(typeof value === 'number');
            assert.equal(value, 0x001a001a, "UINT24_LE #1");
            return rst.readToken<number>(Token.UINT32_BE);
          }).then((value) => {
            assert.ok(typeof value === 'number');
            assert.equal(value, 0x1a001a00, "UINT32_BE #2");
            return rst.readToken<number>(Token.UINT32_LE);
          }).then((value) => {
            assert.ok(typeof value === 'number');
            assert.equal(value, 0x001a001a, "UINT32_LE #3");
            return rst.readToken<number>(Token.UINT32_BE);
          }).then((value) => {
            assert.ok(typeof value === 'number');
            assert.equal(value, 0x1a001a00, "UINT32_BE #4");
          });
      });
    });

  });
});

describe("FileTokenizer", () => {

  it("should be able to read from a file", () => {

    return strtok3.fromFile(Path.join(__dirname, 'resources', 'test1.dat')).then((tokenizer) => {

      assert.equal(tokenizer.fileSize, 16, "check file size property");

      return tokenizer.readToken<number>(Token.UINT32_LE)
        .then((value) => {
          assert.ok(typeof value === 'number');
          assert.equal(value, 0x001a001a, "UINT24_LE #1");
          return tokenizer.readToken<number>(Token.UINT32_BE);
        }).then((value) => {
          assert.ok(typeof value === 'number');
          assert.equal(value, 0x1a001a00, "UINT32_BE #2");
          return tokenizer.readToken<number>(Token.UINT32_LE);
        }).then((value) => {
          assert.ok(typeof value === 'number');
          assert.equal(value, 0x001a001a, "UINT32_LE #3");
          return tokenizer.readToken<number>(Token.UINT32_BE);
        }).then((value) => {
          assert.ok(typeof value === 'number');
          assert.equal(value, 0x1a001a00, "UINT32_BE #4");
        });
    });
  });

  it("should throw an EndOfFile exception", () => {

    const pathTestFile = Path.join(__dirname, 'resources', 'test1.dat');

    return fs.stat(pathTestFile).then((stat) => {
      return stat.size;
    }).then((fileSize) => {
      return strtok3.fromFile(pathTestFile).then((tokenizer) => {
        const buf = new Buffer(fileSize);
        return tokenizer.readBuffer(buf).then((bytesRead) => {
          assert.ok(typeof bytesRead === "number", "readBuffer promise should provide a number");
          assert.equal(fileSize, bytesRead);
        }).then(() => {
          return tokenizer.readBuffer(buf).catch((err) => {
            assert.equal(err, strtok3.EndOfFile);
          });
        });
      });
    });
  });

  it("should be able to ignore (skip) a given number of bytes", () => {
    return strtok3.fromFile(Path.join(__dirname, 'resources', 'test1.dat')).then((tokenizer) => {
      return tokenizer.ignore(4)
        .then(() => {
          return tokenizer.readToken<number>(Token.UINT32_BE);
        }).then((value) => {
          assert.ok(typeof value === "number");
          assert.equal(value, 0x1a001a00, "UINT32_BE #2");
          return tokenizer.readToken<number>(Token.UINT32_LE);
        }).then((value) => {
          assert.ok(typeof value === 'number');
          assert.equal(value, 0x001a001a, "UINT32_LE #3");
          return tokenizer.readToken<number>(Token.UINT32_BE);
        }).then((value) => {
          assert.ok(typeof value === 'number');
          assert.equal(value, 0x1a001a00, "UINT32_BE #4");
        });
    });
  });

  it("should be able to handle multiple ignores", () => {
    return strtok3.fromFile(Path.join(__dirname, 'resources', 'test1.dat')).then((tokenizer) => {
      return tokenizer.readToken<number>(Token.UINT32_LE)
        .then((value) => {
          assert.ok(typeof value === 'number');
          assert.equal(value, 0x001a001a, "UINT24_LE #1");
          return tokenizer.ignore(Token.UINT32_BE.len);
        }).then(() => {
          return tokenizer.ignore(Token.UINT32_LE.len);
        }).then(() => {
          return tokenizer.readToken<number>(Token.UINT32_BE);
        }).then((value) => {
          assert.ok(typeof value === 'number');
          assert.equal(value, 0x1a001a00, "UINT32_BE #4");
        });
    });
  });

  it("should be able to parse the IgnoreType-token", () => {
    return strtok3.fromFile(Path.join(__dirname, 'resources', 'test1.dat')).then((tokenizer) => {
      return tokenizer.readToken<void>(new Token.IgnoreType(4))
        .then(() => {
          return tokenizer.readToken<number>(Token.UINT32_BE);
        }).then((value) => {
          assert.ok(typeof value === 'number');
          assert.equal(value, 0x1a001a00, "UINT32_BE #2");
          return tokenizer.readToken<number>(Token.UINT32_LE);
        }).then((value) => {
          assert.ok(typeof value === 'number');
          assert.equal(value, 0x001a001a, "UINT32_LE #3");
          return tokenizer.readToken<number>(Token.UINT32_BE);
        }).then((value) => {
          assert.ok(typeof value === 'number');
          assert.equal(value, 0x1a001a00, "UINT32_BE #4");
        });
    });
  });
});

describe("Peek token", () => {

  function peekOnData(tokenizer: strtok3.ITokenizer): Promise<void> {
    return tokenizer.peekToken<number>(Token.UINT32_LE)
      .then((value) => {
        assert.ok(typeof value === 'number');
        assert.equal(value, 0x001a001a, "UINT24_LE #1");
        return tokenizer.readToken<number>(Token.UINT32_LE);
      })
      .then((value) => {
        assert.ok(typeof value === 'number');
        assert.equal(value, 0x001a001a, "UINT24_LE #1");
        return tokenizer.readToken<number>(Token.UINT32_BE);
      }).then((value) => {
        assert.ok(typeof value === 'number');
        assert.equal(value, 0x1a001a00, "UINT32_BE #2");
        return tokenizer.readToken<number>(Token.UINT32_LE);
      }).then((value) => {
        assert.ok(typeof value === 'number');
        assert.equal(value, 0x001a001a, "UINT32_LE #3");
        return tokenizer.readToken<number>(Token.UINT32_BE);
      }).then((value) => {
        assert.ok(typeof value === 'number');
        assert.equal(value, 0x1a001a00, "UINT32_BE #4");
      });
  }

  it("should be able to peek from a atream", () => {

    const fileReadStream = fs.createReadStream(Path.join(__dirname, 'resources', 'test1.dat'));
    return strtok3.fromStream(fileReadStream).then((tokenizer) => {

      return peekOnData(tokenizer);

    });
  });

  it("should be able to peek from a file", () => {

    return strtok3.fromFile(Path.join(__dirname, 'resources', 'test1.dat')).then((tokenizer) => {

      assert.equal(tokenizer.fileSize, 16, "check file size property");

      return peekOnData(tokenizer);
    });
  });

  it("should be able to peek from a stream", () => {

    // ToDo
  });

});
