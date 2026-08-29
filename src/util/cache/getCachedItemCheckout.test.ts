jest.mock('../../lib/constants', () => ({
  CACHE_DIR: 'cache',
  EMULSIFY_PROJECT_CONFIG_FILE: 'project.emulsify.json',
}));
jest.mock('../fs/findFileInCurrentPath', () => jest.fn());

import { simpleGit } from 'simple-git';
import { createHash } from 'crypto';
import { join, resolve } from 'path';
import findFileInCurrentPath from '../fs/findFileInCurrentPath.js';
import getCachedItemCheckout from './getCachedItemCheckout.js';

const simpleGitMock = simpleGit as unknown as jest.Mock;
const gitBranchMock = simpleGit().branch as jest.Mock;
const projectPath = resolve('fixtures', 'emulsify');
const repository = 'https://github.com/emulsify-ds/compound.git';
const checkout = 'branch-name';
const cacheKey = createHash('md5')
  .update(JSON.stringify({ projectPath, repository, checkout }))
  .digest('hex');

describe('getCachedItemCheckout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (findFileInCurrentPath as jest.Mock).mockReturnValue(projectPath);
    gitBranchMock.mockResolvedValue({
      current: 'the-current-branch',
    });
  });

  it('forwards repository and checkout to the observable cache path', async () => {
    await expect(
      getCachedItemCheckout({
        bucket: 'systems',
        itemPath: ['compound'],
        repository,
        checkout,
      }),
    ).resolves.toBe('the-current-branch');

    expect(simpleGitMock).toHaveBeenCalledWith(
      join('cache', 'systems', cacheKey, 'compound'),
    );
    expect(gitBranchMock).toHaveBeenCalledTimes(1);
  });
});
