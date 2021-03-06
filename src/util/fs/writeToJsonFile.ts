import { promises as fs } from 'fs';

/**
 * Takes an object and writes it to the specified file path as JSON.
 *
 * @param path Path to the file that should contain the given object (in JSON form).
 * @param json Object that should be converted to JSON, and written to the specified file path.
 *
 * @returns void, or throws an error if the write operation failed.
 */
export default async function loadJsonFile<Json>(
  path: string,
  json: Json
): Promise<void> {
  const data = JSON.stringify(json, null, 2);
  try {
    await fs.writeFile(path, data, {
      encoding: 'utf-8',
    });
  } catch (e) {
    throw new Error(`Unable to write to ${path} with the given JSON: ${data}`);
  }
}
