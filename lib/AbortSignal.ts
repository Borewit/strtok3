import { AbortError } from './stream/Errors.js';

/** Reject an already-cancelled operation before acquiring tokenizer resources. */
export function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new AbortError();
  }
}
