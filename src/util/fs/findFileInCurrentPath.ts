import { existsSync } from 'fs';
import { join, dirname } from 'path';

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
  let foundPath: string | void = undefined;

  while (true) {
    const candidatePath = join(currentPath, fileName);

    if (existsSync(candidatePath)) {
      foundPath = candidatePath;
      break;
    }

    const parentPath = dirname(currentPath);

    if (parentPath === currentPath) {
      break;
    }

    currentPath = parentPath;
  }

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
