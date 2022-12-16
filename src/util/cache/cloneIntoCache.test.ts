jest.mock('../../lib/constants', () => ({
  CACHE_DIR: 'home/uname/.emulsify/cache',
}));
jest.mock('../fs/findFileInCurrentPath', () => jest.fn());

import cloneIntoCache from './cloneIntoCache';
import findFileInCurrentPath from '../fs/findFileInCurrentPath';

import fs from 'fs';
import git from 'simple-git';

const existsSyncMock = fs.existsSync as jest.Mock;
const mkdirMock = fs.promises.mkdir as jest.Mock;
const gitCloneMock = git().clone as jest.Mock;

(findFileInCurrentPath as jest.Mock).mockReturnValue(
  '/home/uname/projects/emulsify'
);

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
    expect.assertions(1);
    existsSyncMock.mockReturnValueOnce(true);
    await cloneIntoCache('systems', ['cornflake'])(cloneOptions);
    expect(gitCloneMock).not.toHaveBeenCalled();
  });

  it('creates the bucketDir if it does not already exist', async () => {
    expect.assertions(1);
    existsSyncMock.mockReturnValueOnce(false).mockReturnValueOnce(false);
    await cloneIntoCache('systems', ['cornflake'])(cloneOptions);
    expect(mkdirMock).toHaveBeenCalledWith(
      'home/uname/.emulsify/cache/systems/2a39785f5c873d7a694ac505a8123bb9',
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
      'home/uname/.emulsify/cache/systems/2a39785f5c873d7a694ac505a8123bb9/cornflake',
      { '--branch': 'branch-name' }
    );
  });

  it('clones using the default branch if no checkout is specified', async () => {
    expect.assertions(1);
    existsSyncMock.mockReturnValueOnce(false).mockReturnValueOnce(true);
    await cloneIntoCache('systems', ['cornflake'])({ repository: 'repo-path' });
    expect(gitCloneMock).toHaveBeenCalledWith(
      'repo-path',
      'home/uname/.emulsify/cache/systems/6342daf21717ab9c095fcddf7943e4e1/cornflake',
      {}
    );
  });
});
