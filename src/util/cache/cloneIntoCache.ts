import type { CacheBucket, CacheItemPath } from '@emulsify-cli/cache';
import type { GitCloneOptions } from '@emulsify-cli/git';

import simpleGit from 'simple-git';
import { existsSync, promises as fs } from 'fs';
import { dirname, join } from 'path';

import { CACHE_DIR } from '../../lib/constants';

const git = simpleGit();

/**
 * Clones a repository into the cache (util) directory, if it does not already exist.
 *
 * @param type CacheBucket value that specifies what type of cache this repository is.
 * @param itemPath array of strings describing the path to the item cache within the specified bucket.
 *
 * @returns void, or throws an error if the repository could not be cloned.
 */
export default function cloneIntoCache(
  type: CacheBucket,
  itemPath: CacheItemPath
) {
  return async ({ repository, checkout }: GitCloneOptions): Promise<void> => {
    // @TODO: Eventually, this needs to support being able to clone different copies of the
    // same system for different projects.
    const destination = join(CACHE_DIR, type, ...itemPath);
    const parentDir = dirname(destination);

    // If the item is already in cache, return void. No work needed.
    if (existsSync(destination)) {
      return;
    }

    // If the bucket/parent directory does not exist, create it.
    if (!existsSync(parentDir)) {
      await fs.mkdir(parentDir, { recursive: true });
    }

    await git.clone(
      repository,
      destination,
      checkout
        ? {
            '--branch': checkout,
          }
        : {}
    );
  };
}
