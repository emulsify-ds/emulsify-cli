jest.mock('../../lib/constants', () => ({
  CACHE_DIR: 'home/uname/.emulsify/cache',
  EMULSIFY_PROJECT_CONFIG_FILE: 'project.emulsify.json',
}));
jest.mock('../fs/findFileInCurrentPath', () => jest.fn());

import { simpleGit } from 'simple-git';
import findFileInCurrentPath from '../fs/findFileInCurrentPath.js';
import getCachedItemCheckout from './getCachedItemCheckout.js';

const simpleGitMock = simpleGit as unknown as jest.Mock;
const gitBranchMock = simpleGit().branch as jest.Mock;

describe('getCachedItemCheckout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (findFileInCurrentPath as jest.Mock).mockReturnValue(
      '/home/uname/projects/emulsify',
    );
    gitBranchMock.mockResolvedValue({
      current: 'the-current-branch',
    });
  });

  it('forwards repository and checkout to the observable cache path', async () => {
    await expect(
      getCachedItemCheckout({
        bucket: 'systems',
        itemPath: ['compound'],
        repository: 'https://github.com/emulsify-ds/compound.git',
        checkout: 'branch-name',
      }),
    ).resolves.toBe('the-current-branch');

    expect(simpleGitMock).toHaveBeenCalledWith(
      'home/uname/.emulsify/cache/systems/9b98dd5ac046dc9335088731270ccc72/compound',
    );
    expect(gitBranchMock).toHaveBeenCalledTimes(1);
  });
});
