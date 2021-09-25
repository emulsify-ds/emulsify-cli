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
const gitFetchMock = git().fetch as jest.Mock;
const gitCheckoutMock = git().checkout as jest.Mock;
const gitPullMock = git().pull as jest.Mock;

(findFileInCurrentPath as jest.Mock).mockReturnValue(
  '/home/uname/projects/emulsify'
);

describe('cloneIntoCache', () => {
  beforeEach(() => {
    existsSyncMock.mockClear();
    gitCloneMock.mockClear();
    gitFetchMock.mockClear();
    gitCheckoutMock.mockClear();
    gitPullMock.mockClear();
  });

  const cloneOptions = {
    repository: 'repo-path',
    checkout: 'branch-name',
  };

  it('can ensure that the correct branch is checked out, and return early if the cache item already exists', async () => {
    expect.assertions(5);
    existsSyncMock.mockReturnValueOnce(true);
    await cloneIntoCache('systems', ['cornflake'])(cloneOptions);
    expect(existsSyncMock).toHaveBeenCalledTimes(1);
    expect(gitFetchMock).toHaveBeenCalledTimes(1);
    expect(gitPullMock).toHaveBeenCalledTimes(1);
    expect(gitCheckoutMock).toHaveBeenCalledWith('branch-name');
    expect(gitCloneMock).not.toHaveBeenCalled();
  });

  it('does not ensure the correct branch is checked out if the checkout variable is void', async () => {
    expect.assertions(3);
    existsSyncMock.mockReturnValueOnce(true);
    await cloneIntoCache('systems', ['cornflake'])({
      ...cloneOptions,
      checkout: undefined,
    });
    expect(gitFetchMock).not.toHaveBeenCalledTimes(1);
    expect(gitCheckoutMock).not.toHaveBeenCalledWith('branch-name');
    expect(gitCloneMock).not.toHaveBeenCalled();
  });

  it('creates the bucketDir if it does not already exist', async () => {
    expect.assertions(1);
    existsSyncMock.mockReturnValueOnce(false).mockReturnValueOnce(false);
    await cloneIntoCache('systems', ['cornflake'])(cloneOptions);
    expect(mkdirMock).toHaveBeenCalledWith(
      'home/uname/.emulsify/cache/systems/f556ea98d7e82a3bb86892c77634c0b3',
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
      'home/uname/.emulsify/cache/systems/f556ea98d7e82a3bb86892c77634c0b3/cornflake',
      { '--branch': 'branch-name' }
    );
  });

  it('clones using the default branch if no checkout is specified', async () => {
    expect.assertions(1);
    existsSyncMock.mockReturnValueOnce(false).mockReturnValueOnce(true);
    await cloneIntoCache('systems', ['cornflake'])({ repository: 'repo-path' });
    expect(gitCloneMock).toHaveBeenCalledWith(
      'repo-path',
      'home/uname/.emulsify/cache/systems/f556ea98d7e82a3bb86892c77634c0b3/cornflake',
      {}
    );
  });
});
