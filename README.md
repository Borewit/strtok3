[![Build Status](https://travis-ci.org/Borewit/strtok3.svg?branch=master)](https://travis-ci.org/Borewit/strtok3)
[![NPM version](https://badge.fury.io/js/strtok3.svg)](https://npmjs.org/package/strtok3)
[![npm downloads](http://img.shields.io/npm/dm/strtok3.svg)](https://npmjs.org/package/strtok3)
[![Dependencies status](https://david-dm.org/Borewit/strtok3/status.svg)](https://david-dm.org/Borewit/strtok3)
[![Coverage status](https://coveralls.io/repos/github/Borewit/strtok3/badge.svg?branch=master)](https://coveralls.io/github/Borewit/strtok3?branch=master)
[![NSP status](https://nodesecurity.io/orgs/borewit/projects/886feaa3-d2f9-40f4-a2ea-4befdcad0176/badge)](https://nodesecurity.io/orgs/borewit/projects/886feaa3-d2f9-40f4-a2ea-4befdcad0176)

A promise based streaming tokenizer for [NodeJS](http://nodejs.org).
This node module is a successor of [strtok2](https://github.com/Borewit/strtok2).

## Usage

The `strtok3` contains one class, `ReadStreamTokenizer`, which is constructed with a 
a [stream.Readable](https://nodejs.org/api/stream.html#stream_class_stream_readable).

The `ReadStreamTokenizer` has one method `readToken` which takes a *token* as an argument 
and returns a `Promise` resolving the decoded token value.

The *token* is basically a description what to read form the stream. 
A basic set of *token types* can be found here: [token-types](https://github.com/Borewit/token-types).

### Reading from a stream

Below is an example of parsing the the first byte from a readable stream as an unsigned-integer:

###### TypeScript:
```TypeScript
import * as strtok3 from "strtok3";
import * as stream from "stream";
import * as Token from "token-types";
    
let readableStream: stream.Readable;
// Assign readable

strtok3.fromStream(readableStream).then((tokenizer) => {
  return tokenizer.readToken<number>(Token.UINT8).then((myUint8Number) => {
    console.log("My number: %s", myUint8Number);
  });
})
```

###### JavaScript:
```JavaScript
var strtok3 = require('strtok3');
var Token = require('token-types');
    
var readableStream;
// Assign readable


strtok3.fromStream(readableStream).then( function(streamTokenizer) {
  return streamTokenizer.readToken(Token.UINT8).then( function(myUint8Number) {
    console.log('My number: %s', myUint8Number);
  });
})
```

### Reading from a file

The same can be done from a file:

###### TypeScript:
```TypeScript
import * as strtok3 from "strtok3";
import * as Token from "token-types";
    
strtok3.fromFile("somefile.bin").then((tokenizer) => {
  return tokenizer.readToken<number>(Token.UINT8).then((myUint8Number) => {
    console.log("My number: %s", myUint8Number);
  });
})
```

###### JavaScript:
```JavaScript
var strtok3 = require('strtok3');
var Token = require('token-types');
    
strtok3.fromFile('somefile.bin').then( function(streamTokenizer) {
  return streamTokenizer.readToken(Token.UINT8).then( function(myUint8Number) {
    console.log('My number: %s', myUint8Number);
  });
})
```
