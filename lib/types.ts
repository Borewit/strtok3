import type { IGetToken } from '@tokenizer/token';

export interface IFileInfo {
  /**
   * File size in bytes
   */
  size?: number;
  /**
   * MIME-type of file
   */
  mimeType?: string;

  /**
   * File path
   */
  path?: string;

  /**
   * File URL
   */
  url?: string;
}

export interface IRandomAccessFileInfo extends IFileInfo {
  /**
   * File size in bytes
   */
  size: number;
}

export interface IReadChunkOptions {
  /**
   * Number of bytes to read.
   */
  length?: number;

  /**
   * Position where to begin reading from the file.
   * Default it is `tokenizer.position`.
   * Position may not be less than `tokenizer.position`, unless `supportsRandomAccess()` returns `true`.
   */
  position?: number;

  /**
   * If set, will not throw an EOF error if not all off the requested data could be read
   */
  mayBeLess?: boolean;
}

export interface IRandomAccessTokenizer extends ITokenizer {
  /**
   * Provide access to information of the underlying information stream or file.
   */
  fileInfo: IRandomAccessFileInfo;

  /**
   * Change the position (offset) of the tokenizer
   * @param position New position, a non-negative safe integer. May be past EOF.
   */
  setPosition(position: number): void;
}

/**
 * The tokenizer allows us to read or peek from the tokenizer-stream.
 * The tokenizer-stream is an abstraction of a stream, file or Buffer.
 */
export interface ITokenizer {
  /**
   * Provide access to information of the underlying information stream or file.
   */
  readonly fileInfo: IFileInfo;

  /**
   * Offset in bytes (= number of bytes read) since beginning of file or stream
   */
  readonly position: number;

  /**
   * Peek (read ahead) buffer from tokenizer
   * @param buffer - Target buffer to fill with data peek from the tokenizer-stream
   * @param options - Read behaviour options
   * @returns Promise with number of bytes read
   */
  peekBuffer(buffer: Uint8Array, options?: IReadChunkOptions): Promise<number>;

  /**
   * Peek (read ahead) buffer from tokenizer
   * @param buffer - Target buffer to fill with data peeked from the tokenizer-stream
   * @param options - Additional read options
   * @returns Promise with number of bytes read
   */
  readBuffer(buffer: Uint8Array, options?: IReadChunkOptions): Promise<number>;

  /**
   * Peek a token from the tokenizer-stream.
   * @param token - Token to peek from the tokenizer-stream.
   * @param position - Offset where to begin reading within the file. If position is null, data will be read from the current file position.
   * @param maybeless - If set, will not throw an EOF error if the less then the requested length could be read.
   */
  peekToken<T>(token: IGetToken<T>, position?: number | null, maybeless?: boolean): Promise<T>;

  /**
   * Read a token from the tokenizer-stream.
   * @param token - Token to peek from the tokenizer-stream.
   * @param position - Offset where to begin reading within the file. If position is null, data will be read from the current file position.
   */
  readToken<T>(token: IGetToken<T>, position?: number): Promise<T>;

  /**
   * Peek a numeric token from the stream
   * @param token - Numeric token
   * @returns Promise with number
   */
  peekNumber(token: IGetToken<number>): Promise<number>;

  /**
   * Read a numeric token from the stream
   * @param token - Numeric token
   * @returns Promise with number
   */
  readNumber(token: IGetToken<number>): Promise<number>;

  /**
   * Ignore given number of bytes
   * @param length - Number of bytes ignored
   */
  ignore(length: number): Promise<number>;

  /**
   * Clean up resources.
   * It does not close the stream for StreamReader, but is does close the file-descriptor.
   */
  close(): Promise<void>;

  /**
   * Abort pending asynchronous operations
   */
  abort(): Promise<void>;

  /**
   * Returns true when the underlying file supports random access
   */
  supportsRandomAccess(): boolean;
}

export type OnClose = () => Promise<void>;

export interface ITokenizerOptions {
  /**
   * Maximum bytes in a dynamically sized tokenizer buffer or stream lookahead span.
   * Set once when creating the tokenizer; applies to subsequent reads and peeks.
   * Disabled by default (Infinity). Must be a positive safe integer or Infinity.
   * Does not limit total process memory, caller-owned buffers, or decoded token values.
   */
  maxBufferSize?: number;

  /**
   * Pass additional file information to the tokenizer
   */
  fileInfo?: IFileInfo;

  /**
   * Asynchronous callback invoked when a buffer, blob, or file tokenizer is closed.
   * Stream tokenizers manage their reader directly and do not invoke this callback.
   */
  onClose?: OnClose;

  /**
   * Pass `AbortSignal` which can stop active async operations
   * Ref: https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal
   */
  abortSignal?: AbortSignal;
}

/** A finite, borrowed range of a tokenizer with positions relative to its start. */
export interface ITokenizerView extends ITokenizer {
  /** Declared range size; this is not a guarantee that the source contains all bytes. */
  readonly fileInfo: IRandomAccessFileInfo;
  /** Declared bytes between the shared cursor and the end of the view. */
  readonly remaining: number;
  /** Create a nested view at the current position without consuming input. */
  createView(length: number): ITokenizerView;
  /** Consume exactly the remaining bytes, rejecting with EndOfStreamError on truncation. */
  consumeRemainder(): Promise<number>;
}

/** A view exposes position control only when its source supports random access. */
export interface IRandomAccessTokenizerView extends ITokenizerView, IRandomAccessTokenizer {
  readonly fileInfo: IRandomAccessFileInfo;
  createView(length: number): IRandomAccessTokenizerView;
}
