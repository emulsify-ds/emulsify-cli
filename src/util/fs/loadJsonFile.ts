import { promises as fs } from 'fs';

/**
 * Loads a JSON file, parses, and returns it.
 *
 * @param path path to the JSON file that should be loaded and parsed.
 *
 * @returns Object representing the JSON file loaded from the given path, or void if no such file exists.
 */
export default async function loadJsonFile<Output>(
  path: string,
): Promise<Output | void> {
  try {
    const json = await fs.readFile(path, {
      encoding: 'utf-8',
    });

    return JSON.parse(json) as Output;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON in "${path}": ${error.message}`);
    }

    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === 'ENOENT'
    ) {
      return undefined;
    }

    throw error;
  }
}
