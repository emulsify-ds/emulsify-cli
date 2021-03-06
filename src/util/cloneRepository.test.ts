jest.mock('git-clone', () => jest.fn());
jest.mock('fs', () => ({
  promises: {
    rmdir: jest.fn(),
  },
}));

import { promises as fs } from 'fs';
import clone from 'git-clone';
import cloneRepository from './cloneRepository';

const cloneMock = (clone as jest.Mock).mockImplementation(
  (_1, _2, _3, cb: () => void) => cb()
);

describe('cloneRepository', () => {
  const repo = 'https://github.com/cornflake-ds/cornflake-drupal.git';
  const targetPath = '/home/uname/Projects/cornflake/themes/cornflake';
  const options = {};

  it('can clone a repository, and resolve', async () => {
    expect.assertions(2);
    await expect(cloneRepository(repo, targetPath, options)).resolves.toBe(
      undefined
    );
    expect(cloneMock).toHaveBeenCalledWith(
      repo,
      targetPath,
      options,
      expect.any(Function)
    );
  });

  it('can remove the .git directory within a newly cloned repository if instructed', async () => {
    expect.assertions(1);
    await cloneRepository(repo, targetPath, {
      removeGitAfterClone: true,
    });
    expect(
      fs.rmdir
    ).toHaveBeenCalledWith(
      '/home/uname/Projects/cornflake/themes/cornflake/.git',
      { recursive: true }
    );
  });

  it('can reject if an error is thrown by git-clone', async () => {
    expect.assertions(1);
    const error = new Error('Does not exist!');
    cloneMock.mockImplementationOnce((_1, _2, _3, cb: (e: Error) => void) =>
      cb(error)
    );

    await expect(cloneRepository(repo, targetPath, options)).rejects.toBe(
      error
    );
  });
});
