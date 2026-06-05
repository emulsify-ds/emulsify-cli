import { existsSync } from 'fs';
import { join, dirname, sep } from 'path';

const foundFileCache = new Map<string, string | void>();

/**
 * Helper method that finds the given file by name in the current directory,
 * or in any parent directories of the current directory.
 *
 * @param fileName name of the file to search for in the current directory, or it's parent directories.
 *
 * @returns string containing the path to the file, or undefined if the file is not found.
 */
export default function findFileInCurrentPath(fileName: string): string | void {
  if (foundFileCache.has(fileName)) {
    return foundFileCache.get(fileName);
  }

  let currentPath = process.cwd();
  while (currentPath !== sep && !existsSync(join(currentPath, fileName))) {
    currentPath = dirname(currentPath);
  }

  const foundPath =
    currentPath !== sep ? join(currentPath, fileName) : undefined;
  foundFileCache.set(fileName, foundPath);

  return foundPath;
}
