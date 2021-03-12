import type { CacheBucket } from '@emulsify-cli/cache';
import type { GitCloneOptions } from '@emulsify-cli/git';

import simpleGit from 'simple-git';
import { existsSync, promises as fs } from 'fs';
import { dirname, join } from 'path';

import { UTIL_DIR } from '../../lib/constants';

const git = simpleGit();

/**
 * Clones a repository into the cache (util) directory, if it does not already exist.
 *
 * @param type CacheBucket value that specifies what type of cache this repository is.
 * @param name String name of the repository that should be cached.
 *
 * @returns void, or throws an error if the repository could not be cloned.
 */
export default function cloneIntoCache(type: CacheBucket, name: string) {
  return async ({ repository, checkout }: GitCloneOptions): Promise<void> => {
    const destination = join(UTIL_DIR, type, name);
    const bucketDir = dirname(destination);

    // If the item is already in cache, return void. No work needed.
    if (existsSync(destination)) {
      return;
    }

    // If the bucket directory does not exist, create it.
    if (!existsSync(bucketDir)) {
      await fs.mkdir(bucketDir, { recursive: true });
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
