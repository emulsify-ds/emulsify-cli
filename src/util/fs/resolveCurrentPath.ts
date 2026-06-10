import { resolve, dirname } from 'path';

/**
 * Resolves the absolute file path and directory path of the currently executing script.
 *
 * @returns An object containing the absolute file path and directory path.
 */
export function resolveCurrentPath() {
  const absoluteFilePath = resolve(process.argv[1]);
  const directoryPath = dirname(absoluteFilePath);

  return {
    absoluteFilePath,
    directoryPath,
  };
}
