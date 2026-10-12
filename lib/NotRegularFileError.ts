/** Thrown when regularFileOnly is enabled and the opened handle is not a regular file. */
export class NotRegularFileError extends Error {
  constructor(public readonly path: string) {
    super(`Not a regular file: ${path}`);
    this.name = 'NotRegularFileError';
  }
}
