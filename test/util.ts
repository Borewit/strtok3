import * as fs from 'fs/promises';
import { ReadableStream } from 'node:stream/web';

export async function makeReadableByteFileStream(filename: string): Promise<{ stream: ReadableStream<Uint8Array>, closeFile: () => Promise<void> }> {

  let position = 0;
  const fileHandle = await fs.open(filename, 'r');

  return {
    stream: new ReadableStream({
      type: 'bytes',

      async pull(controller) {

        // @ts-ignore
        const view = controller.byobRequest.view;

        try {
          const {bytesRead} = await fileHandle.read(view, 0, view.byteLength, position);
          if (bytesRead === 0) {
            await fileHandle.close();
            controller.close();
            // @ts-ignore
            controller.byobRequest.respond(0);
          } else {
            position += bytesRead;
            // @ts-ignore
            controller.byobRequest.respond(bytesRead);
          }
        } catch (err) {
          controller.error(err);
          await fileHandle.close();
        }
      },

      async cancel() {
        await fileHandle.close();
      },

      autoAllocateChunkSize: 1024
    }),
    closeFile: () => {
      return fileHandle.close();
    }
  };
}
