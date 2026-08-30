jest.mock('../../lib/constants', () => ({
  CACHE_DIR: 'cache',
  EMULSIFY_PROJECT_CONFIG_FILE: 'project.emulsify.json',
}));
jest.mock('../fs/findFileInCurrentPath', () => jest.fn());

import type { CachedItemPathOptions } from '@emulsify-cli/cache';
import { createHash } from 'crypto';
import { join, resolve, sep } from 'path';
import findFileInCurrentPath from '../fs/findFileInCurrentPath.js';
import getCachedItemPath from './getCachedItemPath.js';

const cacheDirectory = 'cache';
const projectPath = resolve('fixtures', 'emulsify');
const baseRepository = 'https://github.com/emulsify-ds/compound.git';
const baseCheckout = 'branch-name';
const findFileMock = findFileInCurrentPath as jest.Mock;
const baseOptions: CachedItemPathOptions = {
  bucket: 'systems',
  itemPath: ['compound', 'system.emulsify.json'],
  repository: baseRepository,
  checkout: baseCheckout,
};

function cacheKey(repository: string, checkout?: string): string {
  return createHash('md5')
    .update(
      JSON.stringify({ projectPath, repository, checkout: checkout || '' }),
    )
    .digest('hex');
}

describe('getCachedItemPath', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    findFileMock.mockReturnValue(projectPath);
  });

  it('produces the path to a cached item from its complete identity', () => {
    expect(getCachedItemPath(baseOptions)).toBe(
      join(
        cacheDirectory,
        'systems',
        cacheKey(baseRepository, baseCheckout),
        'compound',
        'system.emulsify.json',
      ),
    );
    expect(
      getCachedItemPath({
        ...baseOptions,
        bucket: 'variants',
        itemPath: ['compound', 'drupal', 'variant.emulsify.json'],
      }),
    ).toBe(
      join(
        cacheDirectory,
        'variants',
        cacheKey(baseRepository, baseCheckout),
        'compound',
        'drupal',
        'variant.emulsify.json',
      ),
    );
  });

  it('uses the repository URL in the cache key', () => {
    const repository = 'https://github.com/example/compound.git';
    const firstRepository = getCachedItemPath(baseOptions);
    const secondRepository = getCachedItemPath({
      ...baseOptions,
      repository,
    });

    expect(firstRepository).not.toBe(secondRepository);
    expect(secondRepository).toContain(
      `${sep}${cacheKey(repository, baseCheckout)}${sep}`,
    );
  });

  it('uses the checkout in the cache key', () => {
    const checkout = 'other-branch';
    expect(getCachedItemPath({ ...baseOptions, checkout })).toContain(
      `${sep}${cacheKey(baseRepository, checkout)}${sep}`,
    );
  });

  it('normalizes whitespace and trailing slashes in repository URLs', () => {
    expect(
      getCachedItemPath({
        ...baseOptions,
        repository: '  https://github.com/emulsify-ds/compound.git/  ',
      }),
    ).toBe(getCachedItemPath(baseOptions));
  });

  it('treats an undefined checkout as an empty checkout', () => {
    expect(getCachedItemPath({ ...baseOptions, checkout: undefined })).toBe(
      getCachedItemPath({ ...baseOptions, checkout: '' }),
    );
  });

  it('throws an error if a project config file is not found', () => {
    findFileMock.mockReturnValueOnce(undefined);

    expect(() => getCachedItemPath(baseOptions)).toThrow(
      'Unable to find project.emulsify.json',
    );
  });
});
