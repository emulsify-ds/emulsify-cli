/* eslint @typescript-eslint/ban-ts-comment: 0 */
// @ts-nocheck
// This file is escaping ts checks for now, because the child_process.exec
// mock fn is selecting a specific exec overload that is incorrect.
// @TODO: dig into this and figure out how to get typescript to use
// the correct overload.
import childproc from 'child_process';
import executeScript from './executeScript';

const execMock = jest.spyOn(childproc, 'exec');

describe('executeScript', () => {
  it('can execute a script, and resolve the stdout', async () => {
    expect.assertions(2);
    execMock.mockImplementationOnce((_, callback: () => void) =>
      callback(null, 'done')
    );
    await expect(executeScript('path.js')).resolves.toBe('done');
    expect(execMock).toHaveBeenCalledWith('path.js', expect.any(Function));
  });

  it('can execute a script, and resolve the stderr', async () => {
    expect.assertions(1);
    execMock.mockImplementationOnce((_, callback: () => void) =>
      callback(null, null, 'well, that went poorly')
    );
    await expect(executeScript('path.js')).resolves.toBe(
      'well, that went poorly'
    );
  });

  it('can execute a script, and reject with an error', async () => {
    expect.assertions(1);
    execMock.mockImplementationOnce((_, callback: () => void) =>
      callback(new Error('well, that went SUPER poorly'))
    );
    await expect(executeScript('path.js')).rejects.toEqual(
      Error('well, that went SUPER poorly')
    );
  });
});
