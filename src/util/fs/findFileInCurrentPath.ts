import { existsSync } from 'fs';
import { join, dirname, sep } from 'path';
import R from 'ramda';

/**
 * Helper method that finds the given file by name in the current directory,
 * or in any parent directories of the current directory.
 *
 * @param fileName name of the file to search for in the current directory, or it's parent directories.
 *
 * @returns string containing the path to the file, or undefined if the file is not found.
 */
export default function findFileInCurrentPath(fileName: string): string | void {
  const directoryContainsFile = (path: string): boolean =>
    existsSync(join(path, fileName));
  const reachedCwdRoot = (path: string): boolean => path === sep;
  const incrementLeftTraversal = (path: string): string => dirname(path);

  const path: string = R.until(
    R.either(directoryContainsFile, reachedCwdRoot),
    incrementLeftTraversal
  )(process.cwd());

  if (!reachedCwdRoot(path)) {
    return R.memoizeWith(join(path, fileName));
  }

  return undefined;
}
