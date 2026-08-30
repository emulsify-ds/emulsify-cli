import type { CacheBucket, CacheItemPath } from '@emulsify-cli/cache';
import type { GitCloneOptions } from '@emulsify-cli/git';

import { simpleGit } from 'simple-git';
import { existsSync, promises as fs } from 'fs';
import { basename, dirname, join } from 'path';
import { EMULSIFY_CACHE_METADATA_FILE } from '../../lib/constants.js';

import getCachedItemPath from './getCachedItemPath.js';
import normalizeRepositoryUrl from './normalizeRepositoryUrl.js';
import getNonInteractiveGitEnvironment from '../getNonInteractiveGitEnvironment.js';

type CacheMetadata = {
  repository: string;
  checkout: string | null;
  resolvedRef: string;
  clonedAt: string;
  complete: true;
};

type RemoteRefResult =
  | { status: 'found'; resolvedRef: string }
  | { status: 'missing' }
  | { status: 'unavailable' };

type CacheReuseOptions = {
  refresh?: boolean;
};

const REMOTE_REF_LOOKUP_TIMEOUT_MS = 2_000;
const TEMP_DIRECTORY_MARKER = '.tmp-';
const ABANDONED_TEMP_DIRECTORY_AGE_MS = 24 * 60 * 60 * 1_000;
const TEMP_DIRECTORY_SUFFIX_PATTERN = /^\d+-[a-z\d]{6}$/i;

async function cleanupAbandonedTemporaryDirectories(
  destination: string,
  parentDir: string,
): Promise<void> {
  const prefix = `${basename(destination)}${TEMP_DIRECTORY_MARKER}`;
  let entries;

  try {
    entries = await fs.readdir(parentDir, { withFileTypes: true });
  } catch {
    // Stale temp cleanup is best-effort and must not block cache population.
    return;
  }

  await Promise.all(
    entries.map(async (entry) => {
      if (
        !entry.isDirectory() ||
        !entry.name.startsWith(prefix) ||
        !TEMP_DIRECTORY_SUFFIX_PATTERN.test(entry.name.slice(prefix.length))
      ) {
        return;
      }

      try {
        const temporaryPath = join(parentDir, entry.name);
        const stats = await fs.stat(temporaryPath);
        if (Date.now() - stats.mtimeMs < ABANDONED_TEMP_DIRECTORY_AGE_MS) {
          return;
        }

        await fs.rm(temporaryPath, {
          recursive: true,
          force: true,
        });
      } catch {
        // Another process may have cleaned the same abandoned directory.
      }
    }),
  );
}

function isRenameContention(error: unknown): boolean {
  if (error === null || typeof error !== 'object' || !('code' in error)) {
    return false;
  }

  return ['EEXIST', 'ENOTEMPTY', 'EPERM'].includes(String(error.code));
}

function isCacheMetadata(value: unknown): value is CacheMetadata {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const metadata = value as Partial<CacheMetadata>;
  return (
    typeof metadata.repository === 'string' &&
    (typeof metadata.checkout === 'string' || metadata.checkout === null) &&
    typeof metadata.resolvedRef === 'string' &&
    metadata.resolvedRef.length > 0 &&
    typeof metadata.clonedAt === 'string' &&
    !Number.isNaN(Date.parse(metadata.clonedAt)) &&
    metadata.complete === true
  );
}

async function readCacheMetadata(
  destination: string,
): Promise<CacheMetadata | undefined> {
  try {
    const contents = await fs.readFile(
      join(destination, EMULSIFY_CACHE_METADATA_FILE),
      { encoding: 'utf-8' },
    );
    const metadata: unknown = JSON.parse(contents);
    return isCacheMetadata(metadata) ? metadata : undefined;
  } catch {
    return undefined;
  }
}

async function writeCacheMetadata(
  destination: string,
  metadata: CacheMetadata,
): Promise<void> {
  await fs.writeFile(
    join(destination, EMULSIFY_CACHE_METADATA_FILE),
    JSON.stringify(metadata, null, 2),
    { encoding: 'utf-8' },
  );
}

function getRemoteRefCandidates(checkout: string | void): string[] {
  if (!checkout) {
    return ['HEAD'];
  }

  if (checkout.startsWith('refs/heads/')) {
    return [checkout];
  }

  if (checkout.startsWith('refs/tags/')) {
    return [`${checkout}^{}`, checkout];
  }

  if (checkout.startsWith('refs/')) {
    return [checkout];
  }

  return [
    `refs/heads/${checkout}`,
    `refs/tags/${checkout}^{}`,
    `refs/tags/${checkout}`,
  ];
}

async function getRemoteResolvedRef(
  repository: string,
  checkout: string | void,
): Promise<RemoteRefResult> {
  const remoteRefs = getRemoteRefCandidates(checkout);

  try {
    const git = simpleGit({
      timeout: {
        block: REMOTE_REF_LOOKUP_TIMEOUT_MS,
        stdOut: false,
        stdErr: false,
      },
    }).env(getNonInteractiveGitEnvironment());
    const output = await git.listRemote([repository, ...remoteRefs]);
    const resolvedRefs = new Map<string, string>();

    for (const line of output.trim().split(/\r?\n/)) {
      const [resolvedRef, refName] = line.trim().split(/\s+/, 2);
      if (resolvedRef && refName) {
        resolvedRefs.set(refName, resolvedRef);
      }
    }

    for (const remoteRef of remoteRefs) {
      const resolvedRef = resolvedRefs.get(remoteRef);
      if (resolvedRef) {
        return { status: 'found', resolvedRef };
      }
    }

    return { status: 'missing' };
  } catch {
    // Remote availability should not prevent reuse of a valid local clone.
    return { status: 'unavailable' };
  }
}

async function canReuseCacheEntry(
  destination: string,
  repository: string,
  checkout: string | void,
  refresh: boolean,
  expectedResolvedRef?: string,
): Promise<boolean> {
  const metadata = await readCacheMetadata(destination);
  const expectedCheckout = checkout || null;
  if (
    !metadata ||
    metadata.repository !== repository ||
    metadata.checkout !== expectedCheckout ||
    (expectedResolvedRef !== undefined &&
      metadata.resolvedRef !== expectedResolvedRef)
  ) {
    return false;
  }

  try {
    const git = simpleGit(destination);
    const origin = (await git.getRemotes(true)).find(
      (remote) => remote.name === 'origin',
    );
    if (!origin || normalizeRepositoryUrl(origin.refs.fetch) !== repository) {
      return false;
    }

    const localResolvedRef = (await git.revparse(['HEAD'])).trim();
    if (localResolvedRef !== metadata.resolvedRef) {
      return false;
    }
  } catch {
    return false;
  }

  if (!refresh) {
    return true;
  }

  const remoteRef = await getRemoteResolvedRef(repository, checkout);
  return (
    remoteRef.status === 'unavailable' ||
    (remoteRef.status === 'found' &&
      remoteRef.resolvedRef === metadata.resolvedRef)
  );
}

/**
 * Clones a repository into the cache (util) directory, if it does not already exist.
 *
 * @param type CacheBucket value that specifies what type of cache this repository is.
 * @param itemPath array of strings describing the path to the item cache within the specified bucket.
 * @param options cache reuse behavior.
 * @param options.refresh whether to compare the cached ref with the remote before reuse.
 *
 * @returns void, or throws an error if the repository could not be cloned.
 */
export default function cloneIntoCache(
  bucket: CacheBucket,
  itemPath: CacheItemPath,
  { refresh = false }: CacheReuseOptions = {},
) {
  return async ({ repository, checkout }: GitCloneOptions): Promise<void> => {
    const normalizedRepository = normalizeRepositoryUrl(repository);
    const destination = getCachedItemPath({
      bucket,
      itemPath,
      repository: normalizedRepository,
      checkout,
    });
    const parentDir = dirname(destination);

    await fs.mkdir(parentDir, { recursive: true });
    await cleanupAbandonedTemporaryDirectories(destination, parentDir);

    // Reuse only complete clones whose identity, origin, and resolved ref match.
    if (existsSync(destination)) {
      if (
        await canReuseCacheEntry(
          destination,
          normalizedRepository,
          checkout,
          refresh,
        )
      ) {
        return;
      }
    }

    const temporaryDestination = await fs.mkdtemp(
      `${destination}${TEMP_DIRECTORY_MARKER}${process.pid}-`,
    );
    let removeTemporaryDestination = true;

    try {
      const git = simpleGit();
      await git.clone(
        normalizedRepository,
        temporaryDestination,
        checkout
          ? {
              '--branch': checkout,
            }
          : {},
      );

      const resolvedRef = (
        await simpleGit(temporaryDestination).revparse(['HEAD'])
      ).trim();
      await writeCacheMetadata(temporaryDestination, {
        repository: normalizedRepository,
        checkout: checkout || null,
        resolvedRef,
        clonedAt: new Date().toISOString(),
        complete: true,
      });

      if (existsSync(destination)) {
        if (
          await canReuseCacheEntry(
            destination,
            normalizedRepository,
            checkout,
            false,
            resolvedRef,
          )
        ) {
          return;
        }

        await fs.rm(destination, { recursive: true, force: true });
      }

      try {
        await fs.rename(temporaryDestination, destination);
        removeTemporaryDestination = false;
      } catch (error) {
        if (
          isRenameContention(error) &&
          existsSync(destination) &&
          (await canReuseCacheEntry(
            destination,
            normalizedRepository,
            checkout,
            false,
            resolvedRef,
          ))
        ) {
          return;
        }

        throw error;
      }
    } finally {
      if (removeTemporaryDestination) {
        try {
          await fs.rm(temporaryDestination, {
            recursive: true,
            force: true,
          });
        } catch {
          // Cleanup must not hide the clone result; a later run prunes leftovers.
        }
      }
    }
  };
}
