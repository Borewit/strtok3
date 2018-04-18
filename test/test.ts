import * as Token from "token-types";
import {} from "mocha";
import {assert} from "chai";
import {SourceStream} from "./util";
import * as strtok3 from "../src";
import * as Path from "path";
import * as fs from "fs-extra";
import {ITokenizer} from "../src/index";

describe("ReadStreamTokenizer", () => {

  it("should decode buffer", () => {

    const ss = SourceStream.FromString("\x05peter");
    return strtok3.fromStream(ss).then(rst => {
      // should decode UINT8 from chunk
      assert.strictEqual(rst.position, 0);
      return rst.readToken(Token.UINT8).then(value => {
        assert.ok(typeof value === "number");
        assert.equal(value, 5, "0x05 == 5");
      }).then(() => {
        // should decode string from chunk
        assert.strictEqual(rst.position, 1);
        return rst.readToken(new Token.StringType(5, "utf-8")).then(value => {
          assert.ok(typeof value === "string");
          assert.equal(value, "peter", "0x05 == 5");
          assert.strictEqual(rst.position, 6);
        });
      }).then(() => { // should should reject at the end of the stream
        return rst.readToken(Token.UINT8).then(() => {
          assert.fail("Should reject due to end-of-stream");
        }).catch(err => {
          assert.equal(err.message, strtok3.endOfFile);
        });
      });
    });
  });

  it("should pick length from buffer, if length is not explicit defined", () => {

    const ss = SourceStream.FromString("\x05peter");
    return strtok3.fromStream(ss).then(rst => {

      const buf = new Buffer(4);

      // should decode UINT8 from chunk
      assert.strictEqual(rst.position, 0);
      return rst.readBuffer(buf).then(bufferLength => {
        assert.strictEqual(bufferLength, buf.length);
        assert.strictEqual(rst.position, buf.length);
      });
    });
  });

  it("should contain fileSize if constructed from file-read-stream", () => {

    // ToDo

    const fileReadStream = fs.createReadStream(Path.join(__dirname, "resources", "test1.dat"));
    return strtok3.fromStream(fileReadStream).then(rst => {
      assert.equal(rst.fileSize, 16, " ReadStreamTokenizer.fileSize");
      fileReadStream.close();
    });
  });

  describe("Parsing binary numbers", () => {

    it("should encode signed 8-bit integer (INT8)", () => {

      const b = new Buffer(1);

      Token.INT8.put(b, 0, 0x00);
      assert.strictEqual(b.toString("binary"), "\x00");

      Token.INT8.put(b, 0, 0x22);
      assert.strictEqual(b.toString("binary"), "\x22");

      Token.INT8.put(b, 0, -0x22);
      assert.strictEqual(b.toString("binary"), "\xde");
    });

    it("should decode signed 8-bit integer (INT8)", () => {

      const ss = SourceStream.FromString("\x00\x7f\x80\xff\x81");
      return strtok3.fromStream(ss).then(rst => {

        return rst.readToken(Token.INT8)
          .then(value => {
            assert.ok(typeof value === "number");
            assert.equal(value, 0, "INT8 #1 == 0");
            return rst.readToken(Token.INT8);
          }).then(value => {
            assert.ok(typeof value === "number");
            assert.equal(value, 127, "INT8 #2 == 127");
            return rst.readToken(Token.INT8);
          }).then(value => {
            assert.ok(typeof value === "number");
            assert.equal(value, -128, "INT8 #3 == -128");
            return rst.readToken(Token.INT8);
          }).then(value => {
            assert.ok(typeof value === "number");
            assert.equal(value, -1, "INT8 #4 == -1");
            return rst.readToken(Token.INT8);
          }).then(value => {
            assert.ok(typeof value === "number");
            assert.equal(value, -127, "INT8 #5 == -127");
          });
      });
    });

    it("should encode signed 16-bit big-endian integer (INT16_BE)", () => {

      const b = new Buffer(2);

      Token.INT16_BE.put(b, 0, 0x00);
      assert.strictEqual(b.toString("binary"), "\x00\x00");

      Token.INT16_BE.put(b, 0, 0x0f0b);
      assert.strictEqual(b.toString("binary"), "\x0f\x0b");

      Token.INT16_BE.put(b, 0, -0x0f0b);
      assert.strictEqual(b.toString("binary"), "\xf0\xf5");
    });

    it("should decode signed 16-bit big-endian integer (INT16_BE)", () => {

      const ss = SourceStream.FromString("\x0a\x1a\x00\x00\xff\xff\x80\x00");
      return strtok3.fromStream(ss).then(rst => {

        return rst.readToken(Token.INT16_BE)
          .then(value => {
            assert.ok(typeof value === "number");
            assert.equal(value, 2586, "INT16_BE#1");
            return rst.readToken(Token.INT16_BE);
          }).then(value => {
            assert.ok(typeof value === "number");
            assert.equal(value, 0, "INT16_BE#2");
            return rst.readToken(Token.INT16_BE);
          }).then(value => {
            assert.ok(typeof value === "number");
            assert.equal(value, -1, "INT16_BE#3");
            return rst.readToken(Token.INT16_BE);
          }).then(value => {
            assert.ok(typeof value === "number");
            assert.equal(value, -32768, "INT16_BE#4");
          });
      });
    });

    it("should encode signed 24-bit big-endian integer (INT24_BE)", () => {

      const b = new Buffer(3);

      Token.INT24_BE.put(b, 0, 0x00);
      assert.strictEqual(b.toString("binary"), "\x00\x00\x00");

      Token.INT24_BE.put(b, 0, 0x0f0ba0);
      assert.strictEqual(b.toString("binary"), "\x0f\x0b\xa0");

      Token.INT24_BE.put(b, 0, -0x0f0bcc);
      assert.strictEqual(b.toString("binary"), "\xf0\xf4\x34");
    });

    it("should decode signed 24-bit big-endian integer (INT24_BE)", () => {

      const ss = SourceStream.FromString("\x00\x00\x00\xff\xff\xff\x10\x00\xff\x80\x00\x00");
      return strtok3.fromStream(ss).then(rst => {

        return rst.readToken(Token.INT24_BE)
          .then(value => {
            assert.ok(typeof value === "number");
            assert.equal(value, 0, "INT24_BE#1");
            return rst.readToken(Token.INT24_BE);
          }).then(value => {
            assert.ok(typeof value === "number");
            assert.equal(value, -1, "INT24_BE#2");
            return rst.readToken(Token.INT24_BE);
          }).then(value => {
            assert.ok(typeof value === "number");
            assert.equal(value, 1048831, "INT24_BE#3");
            return rst.readToken(Token.INT24_BE);
          }).then(value => {
            assert.ok(typeof value === "number");
            assert.equal(value, -8388608, "INT24_BE#4");
          });
      });
    });

    // ToDo: test decoding: INT24_LE

    it("should encode signed 32-bit big-endian integer (INT32_BE)", () => {

      const b = new Buffer(4);

      Token.INT32_BE.put(b, 0, 0x00);
      assert.strictEqual(b.toString("binary"), "\x00\x00\x00\x00");

      Token.INT32_BE.put(b, 0, 0x0f0bcca0);
      assert.strictEqual(b.toString("binary"), "\x0f\x0b\xcc\xa0");

      Token.INT32_BE.put(b, 0, -0x0f0bcca0);
      assert.strictEqual(b.toString("binary"), "\xf0\xf4\x33\x60");
    });

    it("should decode signed 32-bit big-endian integer (INT32_BE)", () => {

      const ss = SourceStream.FromString("\x00\x00\x00\x00\xff\xff\xff\xff\x00\x10\x00\xff\x80\x00\x00\x00");
      return strtok3.fromStream(ss).then(rst => {

        return rst.readToken(Token.INT32_BE)
          .then(value => {
            assert.ok(typeof value === "number");
            assert.equal(value, 0, "INT24_BE #1");
            return rst.readToken(Token.INT32_BE);
          }).then(value => {
            assert.ok(typeof value === "number");
            assert.equal(value, -1, "INT32_BE #2");
            return rst.readToken(Token.INT32_BE);
          }).then(value => {
            assert.ok(typeof value === "number");
            assert.equal(value, 1048831, "INT32_BE #3");
            return rst.readToken(Token.INT32_BE);
          }).then(value => {
            assert.ok(typeof value === "number");
            assert.equal(value, -2147483648, "INT32_BE #4");
          });
      });
    });

    it("should encode signed 8-bit big-endian integer (INT8)", () => {

      const b = new Buffer(1);

      Token.UINT8.put(b, 0, 0x00);
      assert.strictEqual(b.toString("binary"), "\x00");

      Token.UINT8.put(b, 0, 0xff);
      assert.strictEqual(b.toString("binary"), "\xff");
    });

    it("should decode unsigned 8-bit big-endian integer (UINT8)", () => {

      const ss = SourceStream.FromString("\x00\x1a\xff");
      return strtok3.fromStream(ss).then(rst => {

        return rst.readToken(Token.UINT8)
          .then(value => {
            assert.ok(typeof value === "number");
            assert.equal(value, 0, "UINT8 #1");
            return rst.readToken(Token.UINT8);
          }).then(value => {
            assert.ok(typeof value === "number");
            assert.equal(value, 26, "UINT8 #2");
            return rst.readToken(Token.UINT8);
          }).then(value => {
            assert.ok(typeof value === "number");
            assert.equal(value, 255, "UINT8 #3");
          });
      });
    });

    it("should encode unsigned 16-bit big-endian integer (UINT16_LE)", () => {

      const b = new Buffer(4);

      Token.UINT16_LE.put(b, 0, 0x00);
      Token.UINT16_LE.put(b, 2, 0xffaa);
      assert.strictEqual(b.toString("binary"), "\x00\x00\xaa\xff");
    });

    it("should encode unsigned 16-bit little-endian integer (UINT16_BE)", () => {
      const b = new Buffer(4);
      Token.UINT16_BE.put(b, 0, 0xf);
      Token.UINT16_BE.put(b, 2, 0xffaa);
      assert.strictEqual(b.toString("binary"), "\x00\x0f\xff\xaa");
    });

    it("should encode unsigned 16-bit mixed little/big-endian integers", () => {
      const b = new Buffer(4);
      Token.UINT16_BE.put(b, 0, 0xffaa);
      Token.UINT16_LE.put(b, 2, 0xffaa);
      assert.strictEqual(b.toString("binary"), "\xff\xaa\xaa\xff");
    });

    it("should decode unsigned mixed 16-bit big/little-endian integer", () => {

      const ss = SourceStream.FromString("\x1a\x00\x1a\x00\x1a\x00\x1a\x00");
      return strtok3.fromStream(ss).then(rst => {

        return rst.readToken(Token.UINT16_LE)
          .then(value => {
            assert.ok(typeof value === "number");
            assert.equal(value, 0x001a, "UINT16_LE #1");
            return rst.readToken(Token.UINT16_BE);
          }).then(value => {
            assert.ok(typeof value === "number");
            assert.equal(value, 0x1a00, "UINT16_BE #2");
            return rst.readToken(Token.UINT16_LE);
          }).then(value => {
            assert.ok(typeof value === "number");
            assert.equal(value, 0x001a, "UINT16_BE #3");
            return rst.readToken(Token.UINT16_BE);
          }).then(value => {
            assert.ok(typeof value === "number");
            assert.equal(value, 0x1a00, "UINT16_LE #4");
          });
      });
    });

    it("should encode unsigned 24-bit little-endian integer (UINT24_LE)", () => {

      const b = new Buffer(3);

      Token.UINT24_LE.put(b, 0, 0x00);
      assert.strictEqual(b.toString("binary"), "\x00\x00\x00");

      Token.UINT24_LE.put(b, 0, 0xff);
      assert.strictEqual(b.toString("binary"), "\xff\x00\x00");

      Token.UINT24_LE.put(b, 0, 0xaabbcc);
      assert.strictEqual(b.toString("binary"), "\xcc\xbb\xaa");
    });

    it("should encode unsigned 24-bit big-endian integer (UINT24_BE)", () => {

      const b = new Buffer(3);

      Token.UINT24_BE.put(b, 0, 0x00);
      assert.strictEqual(b.toString("binary"), "\x00\x00\x00");

      Token.UINT24_BE.put(b, 0, 0xff);
      assert.strictEqual(b.toString("binary"), "\x00\x00\xff");

      Token.UINT24_BE.put(b, 0, 0xaabbcc);
      assert.strictEqual(b.toString("binary"), "\xaa\xbb\xcc");
    });

    it("should decode signed 24-bit big/little-endian integer (UINT24_LE/INT24_BE)", () => {

      const ss = SourceStream.FromString("\x1a\x1a\x00\x1a\x1a\x00\x1a\x1a\x00\x1a\x1a\x00");
      return strtok3.fromStream(ss).then(rst => {

        return rst.readToken(Token.UINT24_LE)
          .then(value => {
            assert.ok(typeof value === "number");
            assert.equal(value, 0x001a1a, "INT24_LE#1");
            return rst.readToken(Token.UINT24_BE);
          }).then(value => {
            assert.ok(typeof value === "number");
            assert.equal(value, 0x1a1a00, "INT24_BE#2");
            return rst.readToken(Token.UINT24_LE);
          }).then(value => {
            assert.ok(typeof value === "number");
            assert.equal(value, 0x001a1a, "INT24_LE#3");
            return rst.readToken(Token.UINT24_BE);
          }).then(value => {
            assert.ok(typeof value === "number");
            assert.equal(value, 0x1a1a00, "INT24_BE#4");
          });
      });
    });

    it("should encode unsigned 32-bit little-endian integer (UINT32_LE)", () => {

      const b = new Buffer(4);

      Token.UINT32_LE.put(b, 0, 0x00);
      assert.strictEqual(b.toString("binary"), "\x00\x00\x00\x00");

      Token.UINT32_LE.put(b, 0, 0xff);
      assert.strictEqual(b.toString("binary"), "\xff\x00\x00\x00");

      Token.UINT32_LE.put(b, 0, 0xaabbccdd);
      assert.strictEqual(b.toString("binary"), "\xdd\xcc\xbb\xaa");
    });

    it("should encode unsigned 32-bit big-endian integer (INT32_BE)", () => {

      const b = new Buffer(4);

      Token.UINT32_BE.put(b, 0, 0x00);
      assert.strictEqual(b.toString("binary"), "\x00\x00\x00\x00");

      Token.UINT32_BE.put(b, 0, 0xff);
      assert.strictEqual(b.toString("binary"), "\x00\x00\x00\xff");

      Token.UINT32_BE.put(b, 0, 0xaabbccdd);
      assert.strictEqual(b.toString("binary"), "\xaa\xbb\xcc\xdd");
    });

    it("should decode unsigned 32-bit little/big-endian integer (UINT32_LE/UINT32_BE)", () => {

      const ss = SourceStream.FromString("\x1a\x00\x1a\x00\x1a\x00\x1a\x00\x1a\x00\x1a\x00\x1a\x00\x1a\x00");
      return strtok3.fromStream(ss).then(rst => {

        return rst.readToken(Token.UINT32_LE)
          .then(value => {
            assert.ok(typeof value === "number");
            assert.equal(value, 0x001a001a, "UINT24_LE #1");
            return rst.readToken(Token.UINT32_BE);
          }).then(value => {
            assert.ok(typeof value === "number");
            assert.equal(value, 0x1a001a00, "UINT32_BE #2");
            return rst.readToken(Token.UINT32_LE);
          }).then(value => {
            assert.ok(typeof value === "number");
            assert.equal(value, 0x001a001a, "UINT32_LE #3");
            return rst.readToken(Token.UINT32_BE);
          }).then(value => {
            assert.ok(typeof value === "number");
            assert.equal(value, 0x1a001a00, "UINT32_BE #4");
          });
      });
    });

  });
})
;

describe("FileTokenizer", () => {

  it("should be able to read from a file", () => {

    return strtok3.fromFile(Path.join(__dirname, "resources", "test1.dat")).then(tokenizer => {

      assert.equal(tokenizer.fileSize, 16, "check file size property");

      return tokenizer.readToken(Token.UINT32_LE)
        .then(value => {
          assert.ok(typeof value === "number");
          assert.equal(value, 0x001a001a, "UINT24_LE #1");
          return tokenizer.readToken(Token.UINT32_BE);
        }).then(value => {
          assert.ok(typeof value === "number");
          assert.equal(value, 0x1a001a00, "UINT32_BE #2");
          return tokenizer.readToken(Token.UINT32_LE);
        }).then(value => {
          assert.ok(typeof value === "number");
          assert.equal(value, 0x001a001a, "UINT32_LE #3");
          return tokenizer.readToken(Token.UINT32_BE);
        }).then(value => {
          assert.ok(typeof value === "number");
          assert.equal(value, 0x1a001a00, "UINT32_BE #4");
        });
    });
  });

  it("should throw an EndOfFile exception", () => {

    const pathTestFile = Path.join(__dirname, "resources", "test1.dat");

    return fs.stat(pathTestFile).then(stat => {
      return stat.size;
    }).then(fileSize => {
      return strtok3.fromFile(pathTestFile).then(tokenizer => {
        const buf = new Buffer(fileSize);
        return tokenizer.readBuffer(buf).then(bytesRead => {
          assert.ok(typeof bytesRead === "number", "readBuffer promise should provide a number");
          assert.equal(fileSize, bytesRead);
        }).then(() => {
          return tokenizer.readBuffer(buf).catch(err => {
            assert.equal(err.message, strtok3.endOfFile);
          });
        });
      });
    });
  });

  it("should be able to handle multiple ignores", () => {
    return strtok3.fromFile(Path.join(__dirname, "resources", "test1.dat")).then(tokenizer => {
      return tokenizer.readToken(Token.UINT32_LE)
        .then(value => {
          assert.ok(typeof value === "number");
          assert.equal(value, 0x001a001a, "UINT24_LE #1");
          return tokenizer.ignore(Token.UINT32_BE.len);
        }).then(() => {
          return tokenizer.ignore(Token.UINT32_LE.len);
        }).then(() => {
          return tokenizer.readToken(Token.UINT32_BE);
        }).then(value => {
          assert.ok(typeof value === "number");
          assert.equal(value, 0x1a001a00, "UINT32_BE #4");
        });
    });
  });

  it("should be able to parse the IgnoreType-token", () => {
    return strtok3.fromFile(Path.join(__dirname, "resources", "test1.dat")).then(tokenizer => {
      return tokenizer.readToken(new Token.IgnoreType(4))
        .then(() => {
          return tokenizer.readToken(Token.UINT32_BE);
        }).then(value => {
          assert.ok(typeof value === "number");
          assert.equal(value, 0x1a001a00, "UINT32_BE #2");
          return tokenizer.readToken(Token.UINT32_LE);
        }).then(value => {
          assert.ok(typeof value === "number");
          assert.equal(value, 0x001a001a, "UINT32_LE #3");
          return tokenizer.readToken(Token.UINT32_BE);
        }).then(value => {
          assert.ok(typeof value === "number");
          assert.equal(value, 0x1a001a00, "UINT32_BE #4");
        });
    });
  });
});

describe("Peek token", () => {

  function peekOnData(tokenizer: strtok3.ITokenizer): Promise<void> {
    assert.strictEqual(tokenizer.position, 0);
    return tokenizer.peekToken<number>(Token.UINT32_LE)
      .then(value => {
        assert.ok(typeof value === "number");
        assert.equal(value, 0x001a001a, "UINT24_LE #1");
        assert.strictEqual(tokenizer.position, 0);
        return tokenizer.peekToken(Token.UINT32_LE);
      })
      .then(value => {
        assert.ok(typeof value === "number");
        assert.equal(value, 0x001a001a, "UINT24_LE sequential peek #2");
        assert.strictEqual(tokenizer.position, 0);
        return tokenizer.readToken(Token.UINT32_LE);
      })
      .then(value => {
        assert.ok(typeof value === "number");
        assert.equal(value, 0x001a001a, "UINT24_LE #3");
        assert.strictEqual(tokenizer.position, 4);
        return tokenizer.readToken(Token.UINT32_BE);
      }).then(value => {
        assert.ok(typeof value === "number");
        assert.equal(value, 0x1a001a00, "UINT32_BE #4");
        assert.strictEqual(tokenizer.position, 8);
        return tokenizer.readToken(Token.UINT32_LE);
      }).then(value => {
        assert.ok(typeof value === "number");
        assert.equal(value, 0x001a001a, "UINT32_LE #5");
        assert.strictEqual(tokenizer.position, 12);
        return tokenizer.readToken(Token.UINT32_BE);
      }).then(value => {
        assert.ok(typeof value === "number");
        assert.equal(value, 0x1a001a00, "UINT32_BE #6");
        assert.strictEqual(tokenizer.position, 16);
      });
  }

  it("should be able to peek from a stream", () => {

    const fileReadStream = fs.createReadStream(Path.join(__dirname, "resources", "test1.dat"));
    return strtok3.fromStream(fileReadStream).then(tokenizer => {

      return peekOnData(tokenizer);

    });
  });

  it("should be able to peek from a file", () => {

    return strtok3.fromFile(Path.join(__dirname, "resources", "test1.dat")).then(tokenizer => {

      assert.equal(tokenizer.fileSize, 16, "check file size property");

      return peekOnData(tokenizer);
    });
  });

  describe("Overlapping peeks", () => {

    const testData = "\x01\x02\x03\x04\x05";

    function verifyPeekBehaviour(rst: ITokenizer) {

      const peekBuffer = new Buffer(3);
      const readBuffer = new Buffer(1);

      assert.equal(0, rst.position);
      return rst.peekBuffer(peekBuffer, 0, 3) // Peek #1
        .then(len => {
          assert.equal(3, len);
          assert.deepEqual(peekBuffer, new Buffer("\x01\x02\x03", "binary"), "Peek #1");
          assert.equal(rst.position, 0);
          return rst.readBuffer(readBuffer, 0, 1); // Read #1
        }).then(len => {
          assert.equal(len, 1);
          assert.equal(rst.position, 1);
          assert.deepEqual(readBuffer, new Buffer("\x01", "binary"), "Read #1");
          return rst.peekBuffer(peekBuffer, 0, 3); // Peek #2
        }).then(len => {
          assert.equal(len, 3);
          assert.equal(rst.position, 1);
          assert.deepEqual(peekBuffer, new Buffer("\x02\x03\x04", "binary"), "Peek #2");
          return rst.readBuffer(readBuffer, 0, 1); // Read #2
        }).then(len => {
          assert.equal(len, 1);
          assert.equal(rst.position, 2);
          assert.deepEqual(readBuffer, new Buffer("\x02", "binary"), "Read #2");
          return rst.peekBuffer(peekBuffer, 0, 3); // Peek #3
        }).then(len => {
          assert.equal(len, 3);
          assert.equal(rst.position, 2);
          assert.deepEqual(peekBuffer, new Buffer("\x03\x04\x05", "binary"), "Peek #3");
          return rst.readBuffer(readBuffer, 0, 1); // Read #3
        }).then(len => {
          assert.equal(len, 1);
          assert.equal(rst.position, 3);
          assert.deepEqual(readBuffer, new Buffer("\x03", "binary"), "Read #3");
          return rst.peekBuffer(peekBuffer, 0, 3); // Peek #4
        }).then(len => {
          assert.equal(len, 2, "3 bytes requested to peek, only 2 bytes left");
          assert.equal(rst.position, 3);
          assert.deepEqual(peekBuffer, new Buffer("\x04\x05\x05", "binary"), "Peek #4");
          return rst.readBuffer(readBuffer, 0, 1); // Read #4
        }).then(len => {
          assert.equal(len, 1);
          assert.equal(rst.position, 4);
          assert.deepEqual(readBuffer, new Buffer("\x04", "binary"), "Read #4");
        });
    }

    it("should work with a stream", () => {
      const ss = SourceStream.FromString(testData);

      return strtok3.fromStream(ss).then(rst => {
        return verifyPeekBehaviour(rst);
      });
    });

    it("should work with a file", () => {

      const pathTestFile = Path.join(__dirname, "resources", "test3.dat");

      return fs.writeFile(pathTestFile, new Buffer(testData, "binary")).then(() => {

        return strtok3.fromFile(pathTestFile).then(tokenizer => {
          return verifyPeekBehaviour(tokenizer);
        });
      });

    });

  });

  describe("number", () => {

    const path_test3 = Path.join(__dirname, "resources", "test3.dat");

    it("should be able to peek a number from a file", () => {
      return strtok3.fromFile(path_test3).then(tokenizer => {
        return tokenizer.ignore(tokenizer.fileSize - 4).then(() => {
          return tokenizer.peekNumber(Token.INT32_BE).then(x => {
            assert.strictEqual(x, 33752069);
          });
        });
      });
    });

    it("should be able to peek a number a stream", () => {
      const fileReadStream = fs.createReadStream(path_test3);
      return strtok3.fromStream(fileReadStream).then(tokenizer => {
        return tokenizer.ignore(tokenizer.fileSize - 4).then(() => {
          return tokenizer.peekNumber(Token.INT32_BE).then(x => {
            assert.strictEqual(x, 33752069);
          });
        });
      });
    });

    it("should throw an Error if we reach EOF while peeking a number from a file", () => {
      return strtok3.fromFile(path_test3).then(tokenizer => {
        return tokenizer.ignore(tokenizer.fileSize - 3).then(() => {
          return tokenizer.peekNumber(Token.INT32_BE).then(x => {
            assert.fail("Should throw Error: End-Of-File");
          }).catch(err => {
            assert.strictEqual(err.message, "End-Of-File");
          });
        });
      });
    });

    it("should throw an Error if we reach EOF while peeking a number from a stream", () => {
      const fileReadStream = fs.createReadStream(path_test3);
      return strtok3.fromStream(fileReadStream).then(tokenizer => {
        return tokenizer.ignore(tokenizer.fileSize - 3).then(() => {
          return tokenizer.peekNumber(Token.INT32_BE).then(x => {
            assert.fail("Should throw Error: End-Of-File");
          }).catch(err => {
            assert.strictEqual(err.message, "End-Of-File");
          });
        });
      });
    });

  }); // number

});

describe("Transparency", () => {

  const size = 10 * 1024;
  const buf = new Buffer(size);

  for (let i = 0; i < size; ++i) {
    buf[i] = i % 255;
  }

  function checkStream(tokenizer: strtok3.ITokenizer) {
    let expected = 0;

    function readByte() {
      return tokenizer.readNumber(Token.UINT8)
        .then(v => {
          assert.equal(v, expected % 255, "offset=" + expected);
          ++expected;
          return readByte();
        });
    }

    return readByte().catch(err => {
      assert.equal(err.message, "End-Of-File");
      assert.equal(expected, size, "total number of parsed bytes");
    });
  }

  it("transparency on file", function() {

    this.timeout(10000);

    const pathTestFile = Path.join(__dirname, "resources", "test2.dat");

    return fs.writeFile(pathTestFile, buf).then(() => {

      return strtok3.fromFile(pathTestFile).then(tokenizer => {
        return checkStream(tokenizer);
      });
    });
  });

  it("transparency on stream", () => {

    const ss = new SourceStream(buf);

    return strtok3.fromStream(ss).then(tokenizer => {
      return checkStream(tokenizer);
    });
  });

});

describe("EndOfFile Error", () => {

  it("should not throw an Error if we read exactly until the end of the file", () => {

    const ss = SourceStream.FromString("\x89\x54\x40");
    return strtok3.fromStream(ss).then(rst => {
      return rst.readToken(Token.UINT24_BE).then(num => {
        assert.strictEqual(num, 9000000);
      });
    });
  });

  it("should be thrown if a token EOF reached in the middle of a token", () => {

    const ss = SourceStream.FromString("\x89\x54\x40");
    return strtok3.fromStream(ss).then(rst => {
      return rst.readToken(Token.INT32_BE).then(() => {
        assert.fail("It should throw EndOfFile Error");
      }).catch(err => {
        assert.strictEqual(err.message, strtok3.endOfFile);
      });
    });
  });

  it("should not throw an EOF if we read to buffer", () => {

    const buffer = new Buffer(4);

    const ss = SourceStream.FromString("\x89\x54\x40");
    return strtok3.fromStream(ss).then(rst => {
      return rst.readBuffer(buffer).then(len => {
        assert.strictEqual(len, 3, "should return 3 because no more bytes are available");
      });
    });
  });

});

describe("Ignore", () => {

  function testIgnore(tokenizer: ITokenizer) {
    assert.strictEqual(tokenizer.position, 0);
    return tokenizer.ignore(4)
      .then(() => {
        assert.strictEqual(tokenizer.position, 4);
        return tokenizer.readToken(Token.UINT32_BE);
      }).then(value => {
        assert.ok(typeof value === "number");
        assert.equal(value, 0x1a001a00, "UINT32_BE #2");
        return tokenizer.readToken(Token.UINT32_LE);
      }).then(value => {
        assert.ok(typeof value === "number");
        assert.equal(value, 0x001a001a, "UINT32_LE #3");
        return tokenizer.readToken(Token.UINT32_BE);
      }).then(value => {
        assert.ok(typeof value === "number");
        assert.equal(value, 0x1a001a00, "UINT32_BE #4");
      });
  }

  it("should be able to ignore (skip) on a file", () => {
    return strtok3.fromFile(Path.join(__dirname, "resources", "test1.dat")).then(tokenizer => {
      return testIgnore(tokenizer);
    });
  });

  it("should be able to ignore (skip) on a stream", () => {
    const fileReadStream = fs.createReadStream(Path.join(__dirname, "resources", "test1.dat"));
    return strtok3.fromStream(fileReadStream).then(tokenizer => {
      return testIgnore(tokenizer);
    });
  });

});

describe("0 bytes read", () => {

  const bufZero = new Buffer(0);

  it("should be able to read 0 bytes from a file", () => {
    return strtok3.fromFile(Path.join(__dirname, "resources", "test1.dat")).then(tokenizer => {
      return tokenizer.readBuffer(bufZero);
    });
  });

  it("should be able to read 0 bytes from a stream", () => {
    const fileReadStream = fs.createReadStream(Path.join(__dirname, "resources", "test1.dat"));
    return strtok3.fromStream(fileReadStream).then(tokenizer => {
      return tokenizer.readBuffer(bufZero);
    });
  });

});
