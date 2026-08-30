import type { CachedItemPathOptions } from '@emulsify-cli/cache';

import { join } from 'path';
import { createHash } from 'crypto';
import {
  CACHE_DIR,
  EMULSIFY_PROJECT_CONFIG_FILE,
} from '../../lib/constants.js';
import findFileInCurrentPath from '../fs/findFileInCurrentPath.js';
import normalizeRepositoryUrl from './normalizeRepositoryUrl.js';

/**
 * Accepts an explicit cache identity and returns the full path to the item.
 *
 * @param options cache bucket, item path, repository, and checkout.
 * @returns string containing the full path to the specified cached item.
 */
export default function getCachedItemPath({
  bucket,
  itemPath,
  repository,
  checkout,
}: CachedItemPathOptions): string {
  const projectPath = findFileInCurrentPath(EMULSIFY_PROJECT_CONFIG_FILE);

  if (!projectPath) {
    throw new Error(`Unable to find ${EMULSIFY_PROJECT_CONFIG_FILE}`);
  }

  const normalizedRepository = normalizeRepositoryUrl(repository);
  const normalizedCheckout = checkout || '';
  const identity = JSON.stringify({
    projectPath,
    repository: normalizedRepository,
    checkout: normalizedCheckout,
  });

  return join(
    CACHE_DIR,
    bucket,
    createHash('md5').update(identity).digest('hex'),
    ...itemPath,
  );
}
