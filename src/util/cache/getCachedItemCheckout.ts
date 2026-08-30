import type { CachedItemPathOptions } from '@emulsify-cli/cache';

import { simpleGit } from 'simple-git';
import getCachedItemPath from './getCachedItemPath.js';

/**
 * Takes an explicit cache identity and returns the checkout value (git branch/tag/commit)
 * that is currently checked out within the cloned item.
 *
 * @param options cache bucket, item path, repository, and requested checkout.
 *
 * @returns string indicating the branch/tag/commit that is currently checked out.
 */
export default async function getCachedItemCheckout(
  options: CachedItemPathOptions,
): Promise<string> {
  const location = getCachedItemPath(options);
  const git = simpleGit(location);
  return (await git.branch()).current;
}
