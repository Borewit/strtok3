[![Build Status](https://travis-ci.org/Borewit/strtok3.svg?branch=master)](https://travis-ci.org/Borewit/strtok3)
[![NPM version](https://badge.fury.io/js/strtok3.svg)](https://npmjs.org/package/strtok3)
[![npm downloads](http://img.shields.io/npm/dm/strtok3.svg)](https://npmjs.org/package/strtok3)
[![Dependencies status](https://david-dm.org/Borewit/strtok3/status.svg)](https://david-dm.org/Borewit/strtok3)
[![Coverage status](https://coveralls.io/repos/github/Borewit/strtok3/badge.svg?branch=master)](https://coveralls.io/github/Borewit/strtok3?branch=master)
[![Known Vulnerabilities](https://snyk.io/test/github/Borewit/strtok3/badge.svg?targetFile=package.json)](https://snyk.io/test/github/Borewit/strtok3?targetFile=package.json)
[![Codacy Badge](https://api.codacy.com/project/badge/Grade/59dd6795e61949fb97066ca52e6097ef)](https://www.codacy.com/app/Borewit/strtok3?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=Borewit/strtok3&amp;utm_campaign=Badge_Grade)

# strtok3

A promise based streaming tokenizer for [NodeJS](http://nodejs.org).
This node module is a successor of [strtok2](https://github.com/Borewit/strtok2).

## Usage

The `strtok3` contains one class, `ReadStreamTokenizer`, which is constructed with a 
a [stream.Readable](https://nodejs.org/api/stream.html#stream_class_stream_readable).

The `ReadStreamTokenizer` has one method `readToken` which takes a *token* as an argument 
and returns a `Promise` resolving the decoded token value.

The *token* is basically a description what to read form the stream. 
A basic set of *token types* can be found here: [token-types](https://github.com/Borewit/token-types).

### Examples

Below is an example of parsing the the first byte from a readable stream as an unsigned-integer:

```JavaScript
import * as strtok3 from "strtok3";
import * as Token from "token-types";
    
let readableStream // stream.Readable;
// Assign readable

strtok3.fromStream(readableStream).then(tokenizer => {
  return tokenizer.readToken<number>(Token.UINT8).then(myUint8Number => {
    console.log("My number: %s", myUint8Number);
  });
})
```

The same can be done from a file:

```JavaScript
import * as strtok3 from "strtok3";
import * as Token from "token-types";
    
strtok3.fromFile("somefile.bin").then((tokenizer) => {
  return tokenizer.readToken<number>(Token.UINT8).then(myUint8Number => {
    console.log("My number: %s", myUint8Number);
  });
})
```

Read from a Buffer:
```JavaScript
    
strtok3.fromBuffer(buffer).then((tokenizer) => {
  return tokenizer.readToken<number>(Token.UINT8).then(myUint8Number => {
    console.log("My number: %s", myUint8Number);
  });
})
```

### Browser
To exclude fs based dependencies, you can use:
```JavaScript
import * as strtok3 from 'strtok3/lib/core';
```

| function              | 'strtok3'           | 'strtok3/lib/core'  |
| ----------------------| --------------------|---------------------|
| `parseBuffer`         | ✓                   | ✓                   |
| `parseStream`         | ✓                   | ✓                   |
| `parseFromTokenizer`  | ✓                   | ✓                   |
| `fromFile`            | ✓                   |                     |

If you plan to use `fromStream` you need to polyfill: 
1. buffer: [buffer](https://www.npmjs.com/package/buffer)
2. stream: [web-streams-polyfill](https://www.npmjs.com/package/web-streams-polyfill)
