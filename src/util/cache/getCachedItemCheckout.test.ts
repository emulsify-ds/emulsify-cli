jest.mock('./getCachedItemPath', () =>
  jest.fn(() => '/home/uname/.emulsify/cache/systems/12345/compound'),
);
import git from 'simple-git';
import getCachedItemCheckout from './getCachedItemCheckout';

const gitBranchMock = git().branch as jest.Mock;
gitBranchMock.mockResolvedValue({
  current: 'the-current-branch',
});

describe('getCachedItemCheckout', () => {
  it('can grab the current checkout of the specified repository', async () => {
    expect.assertions(2);
    await expect(getCachedItemCheckout('systems', ['compound'])).resolves.toBe(
      'the-current-branch',
    );
    expect(gitBranchMock).toHaveBeenCalledTimes(1);
  });
});
