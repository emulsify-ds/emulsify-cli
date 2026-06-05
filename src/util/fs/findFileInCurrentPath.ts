import { existsSync } from 'fs';
import { join, dirname, sep } from 'path';

const foundFileCache = new Map<string, string | void>();

/**
 * Helper method that finds the given file by name in the current directory,
 * or in any parent directories of the current directory. Results are cached
 * by the current working directory and file name so repeated lookups avoid
 * filesystem traversal without leaking paths across cwd changes.
 *
 * @param fileName name of the file to search for in the current directory, or it's parent directories.
 *
 * @returns string containing the path to the file, or undefined if the file is not found.
 */
export default function findFileInCurrentPath(fileName: string): string | void {
  const currentWorkingDirectory = process.cwd();
  // Include cwd so multi-project flows do not reuse a path found from another directory.
  const cacheKey = `${currentWorkingDirectory}::${fileName}`;

  if (foundFileCache.has(cacheKey)) {
    return foundFileCache.get(cacheKey);
  }

  let currentPath = currentWorkingDirectory;
  while (currentPath !== sep && !existsSync(join(currentPath, fileName))) {
    currentPath = dirname(currentPath);
  }

  const foundPath =
    currentPath !== sep ? join(currentPath, fileName) : undefined;
  foundFileCache.set(cacheKey, foundPath);

  return foundPath;
}

/**
 * Clears the cached file lookup results.
 *
 * @returns void
 */
export function clearFoundFileCache(): void {
  foundFileCache.clear();
}
