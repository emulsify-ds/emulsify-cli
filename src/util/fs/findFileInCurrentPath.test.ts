import process from 'process';
import fs from 'fs';
import findFileInCurrentPath from './findFileInCurrentPath';

const cwd = jest
  .spyOn(process, 'cwd')
  .mockReturnValue('/home/uname/Projects/cornflake/themes/someTheme');
const existsSync = jest.spyOn(fs, 'existsSync');

describe('findFileInCurrentPath', () => {
  beforeEach(() => {
    cwd.mockClear();
  });
  it('can traverse up a directory until it finds the specified file', () => {
    expect.assertions(1);
    existsSync
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true);
    expect(findFileInCurrentPath('composer.json')).toBe(
      '/home/uname/Projects/cornflake/composer.json',
    );
  });

  it('Memoize its values', () => {
    expect(findFileInCurrentPath('composer.json')).toBe(
      '/home/uname/Projects/cornflake/composer.json',
    );
    expect(cwd).not.toHaveBeenCalled();
  });

  it('returns undefined if the file is not found in the cwd, or a parent directory', () => {
    expect.assertions(1);
    existsSync.mockReturnValue(false);
    expect(findFileInCurrentPath('README.md')).toBe(undefined);
  });
});
