[![Build Status][travis-image]][travis-url] [![NPM version][npm-image]][npm-url] [![npm downloads][npm-downloads-image]][npm-url]

A promise based streaming tokenizer for [NodeJS](http://nodejs.org).
This node module is a successor of [strtok2](https://github.com/Borewit/strtok2).

## Usage

The `strtok3` contains one class, `ReadStreamTokenizer`, which is constructed with a 
a [stream.Readable](https://nodejs.org/api/stream.html#stream_class_stream_readable).

The `ReadStreamTokenizer` has one method `readToken` which takes a *token* as an argument 
and returns a `Promise`.

The *token* is basically a description what to read form the stream. 
A basic set of *token types* can be found here: [token-types](https://github.com/Borewit/token-types).

### Reading from a stream

Below is an example of parsing the the first byte from a readable stream as an unsigned-integer:

```TypeScript
import {ReadStreamTokenizer} from "strtok3";
import * as stream from "stream";
import * as Token from "token-types";
    
let readableStream: stream.Readable;
// Assign readable

const streamTokenizer = new ReadStreamTokenizer(readableStream);

return streamTokenizer.readToken<number>(Token.UINT8).then((myUint8Number) => {
  console.log("My number: %s", myUint8Number);
});
```

### Reading from a file

The same can be done from a file:

```TypeScript
import * as fs from "fs-extra";
import {FileTokenizer} from "strtok3";
import * as Token from "token-types";
    
return fs.open("somefile.bin", "r").then((fd) => {
  const fileTokenizer = new FileTokenizer(fd);

  return fileTokenizer.readToken<number>(Token.UINT8).then((myUint8Number) => {
      console.log("My number: %s", myUint8Number);
    });
});
```
      
[npm-url]: https://npmjs.org/package/strtok3
[npm-image]: https://badge.fury.io/js/strtok3.svg
[npm-downloads-image]: http://img.shields.io/npm/dm/strtok3.svg

[travis-url]: https://travis-ci.org/profile/Borewit/strtok3
[travis-image]: https://api.travis-ci.org/Borewit/strtok3.svg?branch=master