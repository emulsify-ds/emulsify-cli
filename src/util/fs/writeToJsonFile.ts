import { promises as fs } from 'fs';
import { randomUUID } from 'crypto';
import { basename, dirname, join } from 'path';

function createTemporaryPath(path: string): string {
  return join(
    dirname(path),
    `.${basename(path)}.${process.pid}.${randomUUID()}.tmp`,
  );
}

/**
 * Takes an object and writes it to the specified file path as JSON.
 *
 * @param path Path to the file that should contain the given object (in JSON form).
 * @param json Object that should be converted to JSON, and written to the specified file path.
 *
 * @returns void, or throws an error if the write operation failed.
 */
export default async function writeToJsonFile<Json>(
  path: string,
  json: Json,
): Promise<void> {
  const temporaryPath = createTemporaryPath(path);

  try {
    await fs.writeFile(temporaryPath, JSON.stringify(json, null, 2), {
      encoding: 'utf-8',
      flag: 'wx',
      flush: true,
    });
    await fs.rename(temporaryPath, path);
  } catch (error) {
    let cleanupMessage = '';

    try {
      await fs.rm(temporaryPath, { force: true });
    } catch (caughtCleanupError) {
      const cleanupCause = String(caughtCleanupError);
      cleanupMessage = ` Temporary-file cleanup also failed: ${cleanupCause}`;
    }

    throw new Error(
      `Unable to write JSON file at ${path}: ${String(error)}.${cleanupMessage}`,
      { cause: error },
    );
  }
}
