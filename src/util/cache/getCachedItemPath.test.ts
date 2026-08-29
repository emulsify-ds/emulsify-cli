jest.mock('../../lib/constants', () => ({
  CACHE_DIR: 'home/uname/.emulsify/cache',
  EMULSIFY_PROJECT_CONFIG_FILE: 'project.emulsify.json',
}));
jest.mock('../fs/findFileInCurrentPath', () => jest.fn());

import type { CachedItemPathOptions } from '@emulsify-cli/cache';
import findFileInCurrentPath from '../fs/findFileInCurrentPath.js';
import getCachedItemPath from './getCachedItemPath.js';

const findFileMock = findFileInCurrentPath as jest.Mock;
const baseOptions: CachedItemPathOptions = {
  bucket: 'systems',
  itemPath: ['compound', 'system.emulsify.json'],
  repository: 'https://github.com/emulsify-ds/compound.git',
  checkout: 'branch-name',
};

describe('getCachedItemPath', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    findFileMock.mockReturnValue('/home/uname/projects/emulsify');
  });

  it('produces the path to a cached item from its complete identity', () => {
    expect(getCachedItemPath(baseOptions)).toBe(
      'home/uname/.emulsify/cache/systems/9b98dd5ac046dc9335088731270ccc72/compound/system.emulsify.json',
    );
    expect(
      getCachedItemPath({
        ...baseOptions,
        bucket: 'variants',
        itemPath: ['compound', 'drupal', 'variant.emulsify.json'],
      }),
    ).toBe(
      'home/uname/.emulsify/cache/variants/9b98dd5ac046dc9335088731270ccc72/compound/drupal/variant.emulsify.json',
    );
  });

  it('uses the repository URL in the cache key', () => {
    const firstRepository = getCachedItemPath(baseOptions);
    const secondRepository = getCachedItemPath({
      ...baseOptions,
      repository: 'https://github.com/example/compound.git',
    });

    expect(firstRepository).not.toBe(secondRepository);
    expect(secondRepository).toContain('/cbff5fecb35c99193f7b61a1feaba881/');
  });

  it('uses the checkout in the cache key', () => {
    expect(
      getCachedItemPath({ ...baseOptions, checkout: 'other-branch' }),
    ).toContain('/330b95546066d5ea9bed9181f8f4f8b4/');
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
