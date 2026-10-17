/** A request exceeds a tokenizer view, rather than encountering truncated input. */
export class TokenizerBoundaryError extends RangeError {
  constructor(
    public readonly position: number,
    public readonly length: number,
    public readonly size: number
  ) {
    super(`Range at position ${position} with length ${length} exceeds tokenizer view size ${size}`);
    this.name = 'TokenizerBoundaryError';
  }
}
