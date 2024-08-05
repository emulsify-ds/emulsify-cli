import getRepositoryLatestTag from './getRepositoryLatestTag';
import git from 'simple-git';

const gitTagsMock = git().tags as jest.Mock;

describe('getLatestRepositoryTag', () => {
  beforeEach(() => {
    gitTagsMock.mockClear();
  });
  it('Can get latest tag from repository url', async () => {
    expect.assertions(1);
    gitTagsMock.mockReturnValueOnce({ latest: '1.5.0' });
    const latest = await getRepositoryLatestTag(
      'git@github.com:emulsify-ds/compound.git',
    );
    expect(latest).toBe('1.5.0');
  });

  it('Can return empty if no latest tag is found', async () => {
    expect.assertions(1);
    const latest = await getRepositoryLatestTag(
      'git@github.com:emulsify-ds/compoun.git',
    );
    expect(latest).toBe('');
  });
});
