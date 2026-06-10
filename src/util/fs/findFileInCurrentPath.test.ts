import process from 'process';
import fs from 'fs';
import findFileInCurrentPath, {
  clearFoundFileCache,
} from './findFileInCurrentPath.js';

const cwd = jest
  .spyOn(process, 'cwd')
  .mockReturnValue('/home/uname/Projects/cornflake/themes/someTheme');
const existsSync = jest.spyOn(fs, 'existsSync');

describe('findFileInCurrentPath', () => {
  beforeEach(() => {
    clearFoundFileCache();
    cwd.mockReset();
    existsSync.mockReset();
    cwd.mockReturnValue('/home/uname/Projects/cornflake/themes/someTheme');
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

  it('memoizes values for the same cwd and file name', () => {
    expect.assertions(3);
    existsSync
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true);

    expect(findFileInCurrentPath('composer.json')).toBe(
      '/home/uname/Projects/cornflake/composer.json',
    );
    existsSync.mockClear();

    expect(findFileInCurrentPath('composer.json')).toBe(
      '/home/uname/Projects/cornflake/composer.json',
    );
    expect(existsSync).not.toHaveBeenCalled();
  });

  it('returns undefined if the file is not found in the cwd, or a parent directory', () => {
    expect.assertions(1);
    existsSync.mockReturnValue(false);
    expect(findFileInCurrentPath('README.md')).toBe(undefined);
  });

  it('returns different paths for the same file name from different cwds', () => {
    expect.assertions(2);
    cwd
      .mockReturnValueOnce('/workspace/project-a/web/themes/custom/theme')
      .mockReturnValueOnce('/workspace/project-b/web/themes/custom/theme');
    existsSync.mockImplementation((path) =>
      [
        '/workspace/project-a/project.emulsify.json',
        '/workspace/project-b/project.emulsify.json',
      ].includes(String(path)),
    );

    expect(findFileInCurrentPath('project.emulsify.json')).toBe(
      '/workspace/project-a/project.emulsify.json',
    );
    expect(findFileInCurrentPath('project.emulsify.json')).toBe(
      '/workspace/project-b/project.emulsify.json',
    );
  });

  it('does not return a stale cached entry after the cache is cleared', () => {
    expect.assertions(2);
    cwd.mockReturnValue('/workspace/project/web/themes/custom/theme');
    existsSync.mockImplementation(
      (path) => String(path) === '/workspace/project/project.emulsify.json',
    );

    expect(findFileInCurrentPath('project.emulsify.json')).toBe(
      '/workspace/project/project.emulsify.json',
    );

    clearFoundFileCache();
    existsSync.mockReset();
    existsSync.mockReturnValue(false);

    expect(findFileInCurrentPath('project.emulsify.json')).toBe(undefined);
  });
});
