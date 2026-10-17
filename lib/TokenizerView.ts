import type { IGetToken } from '@tokenizer/token';
import { isRandomAccessTokenizer } from './isRandomAccessTokenizer.js';
import { EndOfStreamError } from './stream/index.js';
import { TokenizerBoundaryError } from './TokenizerBoundaryError.js';
import type {
  IRandomAccessFileInfo,
  IRandomAccessTokenizer,
  IRandomAccessTokenizerView,
  IReadChunkOptions,
  ITokenizer,
  ITokenizerView
} from './types.js';

function validateOffset(value: number, name: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${name} must be a non-negative safe integer`);
  }
}

/**
 * Borrow length bytes starting at source.position. Creation never consumes input.
 * All reads advance the shared source cursor; peeks leave it unchanged.
 * Use source, parent and child sequentially. Closing a partial child leaves the
 * parent at the consumed position; consumeRemainder() explicitly advances to its end.
 */
export function createTokenizerView(source: IRandomAccessTokenizer, length: number): IRandomAccessTokenizerView;
export function createTokenizerView(source: ITokenizer, length: number): ITokenizerView;
export function createTokenizerView(source: ITokenizer, length: number): ITokenizerView {
  return isRandomAccessTokenizer(source)
    ? new RandomAccessTokenizerView(source, length)
    : new TokenizerView(source, length);
}

class TokenizerView implements ITokenizerView {
  public readonly fileInfo: IRandomAccessFileInfo;
  protected readonly start: number;
  private closed = false;
  private closedPosition = 0;
  private busy = false;

  constructor(
    protected readonly source: ITokenizer,
    protected readonly size: number
  ) {
    validateOffset(size, 'length');
    validateOffset(source.position, 'source position');
    validateOffset(source.position + size, 'end position');
    if (source instanceof TokenizerView) {
      source.assertAvailable();
      source.translateRange(size, source.position);
    }
    this.start = source.position;
    // A chunk has its own size; the outer file's MIME type/path need not describe it.
    this.fileInfo = { size };
  }

  public get position(): number {
    return this.closed ? this.closedPosition : this.source.position - this.start;
  }

  public get remaining(): number {
    return this.size - this.position;
  }

  public supportsRandomAccess(): boolean {
    return false;
  }

  public createView(length: number): ITokenizerView {
    this.assertAvailable();
    return createTokenizerView(this, length);
  }

  public async readBuffer(buffer: Uint8Array, options?: IReadChunkOptions): Promise<number> {
    return this.bufferOperation('readBuffer', buffer, options);
  }

  public async peekBuffer(buffer: Uint8Array, options?: IReadChunkOptions): Promise<number> {
    return this.bufferOperation('peekBuffer', buffer, options);
  }

  private async bufferOperation(
    method: 'readBuffer' | 'peekBuffer',
    buffer: Uint8Array,
    options?: IReadChunkOptions
  ): Promise<number> {
    this.assertAvailable();
    const length = options?.length ?? buffer.length;
    const position = options?.position ?? this.position;
    const absolutePosition = this.translateRange(length, position);
    if (length > buffer.length) {
      throw new RangeError('length must not exceed the target buffer length');
    }
    return this.run(() => this.source[method](buffer, { ...options, length, position: absolutePosition }));
  }

  public async readToken<T>(token: IGetToken<T>, position = this.position): Promise<T> {
    this.assertAvailable();
    const absolutePosition = this.translateRange(token.len, position);
    return this.run(() => this.source.readToken(token, absolutePosition));
  }

  public async peekToken<T>(token: IGetToken<T>, position: number | null = this.position): Promise<T> {
    this.assertAvailable();
    const absolutePosition = this.translateRange(token.len, position ?? this.position);
    return this.run(() => this.source.peekToken(token, absolutePosition));
  }

  public async readNumber(token: IGetToken<number>): Promise<number> {
    this.assertAvailable();
    this.translateRange(token.len, this.position);
    return this.run(() => this.source.readNumber(token));
  }

  public async peekNumber(token: IGetToken<number>): Promise<number> {
    this.assertAvailable();
    this.translateRange(token.len, this.position);
    return this.run(() => this.source.peekNumber(token));
  }

  public async ignore(length: number): Promise<number> {
    this.assertAvailable();
    this.translateRange(length, this.position);
    return this.run(() => this.source.ignore(length));
  }

  public async consumeRemainder(): Promise<number> {
    this.assertAvailable();
    const length = this.remaining;
    const end = this.translateRange(length, this.position) + length;
    return this.run(async () => {
      if (length === 0) {
        return 0;
      }
      if (isRandomAccessTokenizer(this.source)) {
        // Unlike ignore()/setPosition(), this verifies that the final byte exists,
        // including a file that was truncated after its initial stat. No large read.
        if ((await this.source.peekBuffer(new Uint8Array(1), { position: end - 1 })) !== 1) {
          throw new EndOfStreamError();
        }
        this.source.setPosition(end);
      } else {
        const ignored = await this.source.ignore(length);
        if (ignored !== length) {
          throw new EndOfStreamError();
        }
      }
      return length;
    });
  }

  /** Release this view only. Never drain, close or abort the borrowed source. */
  public async close(): Promise<void> {
    if (this.closed) {
      return;
    }
    if (this.busy) {
      throw new Error('Cannot close a tokenizer view during an active operation');
    }
    this.closedPosition = this.position;
    this.closed = true;
  }

  /** Explicit cancellation propagates to the shared source and affects its other users. */
  public async abort(): Promise<void> {
    if (this.closed) {
      return;
    }
    try {
      await this.source.abort();
    } finally {
      this.closedPosition = this.position;
      this.closed = true;
    }
  }

  protected assertAvailable(): void {
    if (this.closed) {
      throw new Error('Tokenizer view is closed');
    }
    if (this.busy) {
      throw new Error('Tokenizer views require sequential operations');
    }
    if (this.source instanceof TokenizerView) {
      this.source.assertAvailable();
    }
  }

  /** Validate the whole request before delegating or allowing a token allocation. */
  protected translateRange(length: number, position: number): number {
    validateOffset(length, 'length');
    validateOffset(position, 'position');
    validateOffset(position + length, 'end position');
    if (position > this.size || length > this.size - position) {
      throw new TokenizerBoundaryError(position, length, this.size);
    }
    if (!this.supportsRandomAccess() && position < this.position) {
      throw new Error('`options.position` must be equal or greater than `tokenizer.position`');
    }
    return this.start + position;
  }

  private async run<T>(operation: () => Promise<T>): Promise<T> {
    this.busy = true;
    try {
      return await operation();
    } finally {
      this.busy = false;
    }
  }
}

class RandomAccessTokenizerView extends TokenizerView implements IRandomAccessTokenizerView {
  declare protected readonly source: IRandomAccessTokenizer;

  constructor(source: IRandomAccessTokenizer, size: number) {
    super(source, size);
  }

  public supportsRandomAccess(): boolean {
    return true;
  }

  public setPosition(position: number): void {
    this.assertAvailable();
    this.source.setPosition(this.translateRange(0, position));
  }

  public createView(length: number): IRandomAccessTokenizerView {
    this.assertAvailable();
    return createTokenizerView(this, length);
  }
}
