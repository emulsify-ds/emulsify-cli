import getRepositoryLatestTag from './getRepositoryLatestTag.js';
import simpleGit from 'simple-git';

jest.mock('simple-git');

describe('getRepositoryLatestTag', () => {
  let gitMock: any;

  beforeEach(() => {
    gitMock = {
      init: jest.fn().mockReturnThis(),
      addRemote: jest.fn().mockReturnThis(),
      removeRemote: jest.fn().mockReturnThis(),
      fetch: jest.fn().mockReturnThis(),
      tags: jest.fn().mockResolvedValue({ latest: '1.5.0' }),
    };
    (simpleGit as jest.Mock).mockReturnValue(gitMock);
    jest.clearAllMocks();
  });

  it('Can get latest tag from repository url', async () => {
    expect.assertions(1);
    gitMock.tags.mockResolvedValueOnce({ latest: '1.5.0' });
    const latest = await getRepositoryLatestTag(
      'git@github.com:emulsify-ds/compound.git',
    );
    expect(latest).toBe('1.5.0');
  });

  it('Can return empty if no latest tag is found', async () => {
    expect.assertions(1);
    gitMock.tags.mockResolvedValueOnce({ latest: '' });
    const latest = await getRepositoryLatestTag(
      'git@github.com:emulsify-ds/compoun.git',
    );
    expect(latest).toBe('');
  });

  it('should handle errors during init', async () => {
    gitMock.init.mockRejectedValueOnce(new Error('init error'));
    const url = 'git@github.com:emulsify-ds/compound.git';
    await expect(getRepositoryLatestTag(url)).rejects.toThrow('init error');
  });

  it('should handle errors during addRemote', async () => {
    expect.assertions(1);
    gitMock.addRemote.mockRejectedValueOnce(new Error('addRemote error'));
    const url = 'git@github.com:emulsify-ds/compound.git';
    await expect(getRepositoryLatestTag(url)).rejects.toThrow(
      'addRemote error',
    );
  });

  it('should handle errors during removeRemote', async () => {
    gitMock.removeRemote.mockRejectedValueOnce(new Error('removeRemote error'));
    const latest = await getRepositoryLatestTag(
      'git@github.com:emulsify-ds/compound.git',
    );
    expect(latest).toBe('1.5.0');
  });

  it('should handle errors during fetch', async () => {
    gitMock.fetch.mockRejectedValueOnce(new Error('fetch error'));
    const url = 'git@github.com:emulsify-ds/compound.git';
    await expect(getRepositoryLatestTag(url)).rejects.toThrow('fetch error');
  });

  it('should handle errors during tags', async () => {
    gitMock.tags.mockRejectedValueOnce(new Error('tags error'));
    const url = 'git@github.com:emulsify-ds/compound.git';
    await expect(getRepositoryLatestTag(url)).rejects.toThrow('tags error');
  });
});
