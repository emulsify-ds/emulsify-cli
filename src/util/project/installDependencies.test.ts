/* eslint @typescript-eslint/ban-ts-comment: 0 */
// @ts-nocheck
// This file is escaping ts checks for now, because the child_process.exec
// mock fn is selecting a specific exec overload that is incorrect.
// @TODO: dig into this and figure out how to get typescript to use
// the correct overload.
import childproc from 'child_process';
import installDependencies from './installDependencies';

const execMock = jest.spyOn(childproc, 'exec');

describe('installDependencies', () => {
  it('can execute a script, and resolve the stdout', async () => {
    expect.assertions(2);
    execMock.mockImplementationOnce((_a, _b, callback: () => void) =>
      callback(null, 'done')
    );
    await expect(
      installDependencies('/home/uname/projects/emulsify')
    ).resolves.toBe('done');
    expect(execMock).toHaveBeenCalledWith(
      'npm install',
      { cwd: '/home/uname/projects/emulsify' },
      expect.any(Function)
    );
  });

  it('can execute a script, and resolve the stderr', async () => {
    expect.assertions(1);
    execMock.mockImplementationOnce((_a, _b, callback: () => void) =>
      callback(null, null, 'well, that went poorly')
    );
    await expect(
      installDependencies('/home/uname/projects/emulsify')
    ).resolves.toBe('well, that went poorly');
  });

  it('can execute a script, and reject with an error', async () => {
    expect.assertions(1);
    execMock.mockImplementationOnce((_a, _b, callback: () => void) =>
      callback(new Error('well, that went SUPER poorly'))
    );
    await expect(
      installDependencies('/home/uname/projects/emulsify')
    ).rejects.toEqual(Error('well, that went SUPER poorly'));
  });
});
