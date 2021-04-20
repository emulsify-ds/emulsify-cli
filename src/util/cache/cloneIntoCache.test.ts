jest.mock('../../lib/constants', () => ({
  CACHE_DIR: 'home/uname/.emulsify/cache',
}));
import cloneIntoCache from './cloneIntoCache';
import fs from 'fs';
import git from 'simple-git';

const existsSyncMock = fs.existsSync as jest.Mock;
const mkdirMock = fs.promises.mkdir as jest.Mock;
const gitCloneMock = git().clone as jest.Mock;

describe('cloneIntoCache', () => {
  beforeEach(() => {
    existsSyncMock.mockClear();
    gitCloneMock.mockClear();
  });

  const cloneOptions = {
    repository: 'repo-path',
    checkout: 'branch-name',
  };

  it('can return early if the cache item already exists', async () => {
    expect.assertions(2);
    existsSyncMock.mockReturnValueOnce(true);
    await cloneIntoCache('systems', ['cornflake'])(cloneOptions);
    expect(existsSyncMock).toHaveBeenCalledTimes(1);
    expect(gitCloneMock).not.toHaveBeenCalled();
  });

  it('creates the bucketDir if it does not already exist', async () => {
    expect.assertions(1);
    existsSyncMock.mockReturnValueOnce(false).mockReturnValueOnce(false);
    await cloneIntoCache('systems', ['cornflake'])(cloneOptions);
    expect(mkdirMock).toHaveBeenCalledWith(
      'home/uname/.emulsify/cache/systems',
      {
        recursive: true,
      }
    );
  });

  it('clones the repository into the correct bucket and folder', async () => {
    expect.assertions(1);
    existsSyncMock.mockReturnValueOnce(false).mockReturnValueOnce(true);
    await cloneIntoCache('systems', ['cornflake'])(cloneOptions);
    expect(gitCloneMock).toHaveBeenCalledWith(
      'repo-path',
      'home/uname/.emulsify/cache/systems/cornflake',
      { '--branch': 'branch-name' }
    );
  });

  it('clones using the default branch if no checkout is specified', async () => {
    expect.assertions(1);
    existsSyncMock.mockReturnValueOnce(false).mockReturnValueOnce(true);
    await cloneIntoCache('systems', ['cornflake'])({ repository: 'repo-path' });
    expect(gitCloneMock).toHaveBeenCalledWith(
      'repo-path',
      'home/uname/.emulsify/cache/systems/cornflake',
      {}
    );
  });
});
