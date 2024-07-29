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
    return JSON.parse(
      await fs.readFile(path, {
        encoding: 'utf-8',
      }),
    ) as Output;
  } catch {
    return undefined;
  }
}
