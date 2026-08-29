import type { ClearCacheHandlerOptions } from '@emulsify-cli/handlers';

import { promises as fs } from 'fs';
import { join } from 'path';
import { CACHE_DIR } from '../lib/constants.js';
import CliError from '../lib/CliError.js';
import log from '../lib/log.js';

type CacheStats = {
  exists: boolean;
  bucketCount: number;
  entryCount: number;
};

function isMissingPathError(error: unknown): boolean {
  return (
    error !== null &&
    typeof error === 'object' &&
    'code' in error &&
    error.code === 'ENOENT'
  );
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function inspectCache(): Promise<CacheStats> {
  let contents;
  try {
    contents = await fs.readdir(CACHE_DIR, { withFileTypes: true });
  } catch (error) {
    if (isMissingPathError(error)) {
      return { exists: false, bucketCount: 0, entryCount: 0 };
    }

    throw new CliError(
      `Unable to inspect the Emulsify cache at "${CACHE_DIR}": ${getErrorMessage(error)}`,
    );
  }

  const buckets = contents.filter((entry) => entry.isDirectory());
  let entryCount = 0;

  try {
    for (const bucket of buckets) {
      const entries = await fs.readdir(join(CACHE_DIR, bucket.name), {
        withFileTypes: true,
      });
      entryCount += entries.filter((entry) => entry.isDirectory()).length;
    }
  } catch (error) {
    throw new CliError(
      `Unable to inspect the Emulsify cache at "${CACHE_DIR}": ${getErrorMessage(error)}`,
    );
  }

  return {
    exists: true,
    bucketCount: buckets.length,
    entryCount,
  };
}

/**
 * Clear all local Emulsify repository cache entries.
 *
 * @param options command options, including dry-run behavior.
 * @throws {CliError} if the cache cannot be inspected or removed.
 */
export default async function cacheClear({
  dryRun = false,
}: ClearCacheHandlerOptions = {}): Promise<void> {
  const stats = await inspectCache();
  if (!stats.exists) {
    log(
      'info',
      'The Emulsify cache is already empty: 0 buckets and 0 entries.',
    );
    return;
  }

  if (dryRun) {
    log(
      'info',
      `Dry run: the Emulsify cache contains ${stats.bucketCount} buckets and ${stats.entryCount} entries. No files were removed.`,
    );
    return;
  }

  try {
    await fs.rm(CACHE_DIR, { recursive: true, force: true });
  } catch (error) {
    throw new CliError(
      `Unable to clear the Emulsify cache at "${CACHE_DIR}": ${getErrorMessage(error)}`,
    );
  }

  log(
    'success',
    `Cleared the Emulsify cache: removed ${stats.bucketCount} buckets and ${stats.entryCount} entries.`,
  );
}
