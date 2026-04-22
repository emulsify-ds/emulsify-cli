import type { CacheBucket, CacheItemPath } from '@emulsify-cli/cache';

import simpleGit from 'simple-git';
import getCachedItemPath from './getCachedItemPath.js';

/**
 * Takes a cache bucket and item path, and returns the checkout value (git branch/tag/commit)
 * that is currently checked out within the cloned item.
 *
 * @param type CacheBucket value that specifies what type of cache this repository is.
 * @param itemPath array of strings describing the path to the item cache within the specified bucket.
 *
 * @returns string indicating the branch/tag/commit that is currently checked out.
 */
export default async function getCachedItemCheckout(
  bucket: CacheBucket,
  itemPath: CacheItemPath,
): Promise<string> {
  const location = getCachedItemPath(bucket, itemPath);
  const git = simpleGit(location);
  return (await git.branch()).current;
}
