import process from 'process';
import fs from 'fs';
import { clearFoundFileCache } from '../fs/findFileInCurrentPath.js';
import getWordPressInfo from './getWordPressInfo.js';

const cwd = jest.spyOn(process, 'cwd');
const existsSync = jest.spyOn(fs, 'existsSync');

describe('getWordPressInfo', () => {
  beforeEach(() => {
    clearFoundFileCache();
    cwd.mockReset();
    existsSync.mockReset();
  });

  it('detects a standard WordPress themes directory', async () => {
    cwd.mockReturnValue(
      '/home/uname/Projects/cornflake/wp-content/themes/my-theme',
    );
    existsSync.mockImplementation(
      (path) =>
        String(path) === '/home/uname/Projects/cornflake/wp-content/themes',
    );

    await expect(getWordPressInfo()).resolves.toEqual({
      name: 'wordpress',
      root: '/home/uname/Projects/cornflake',
      emulsifyParentDirectory:
        '/home/uname/Projects/cornflake/wp-content/themes',
    });
  });

  it('detects a Bedrock themes directory', async () => {
    cwd.mockReturnValue(
      '/home/uname/Projects/cornflake/web/app/themes/my-theme',
    );
    existsSync.mockImplementation(
      (path) =>
        String(path) === '/home/uname/Projects/cornflake/web/app/themes',
    );

    await expect(getWordPressInfo()).resolves.toEqual({
      name: 'wordpress',
      root: '/home/uname/Projects/cornflake',
      emulsifyParentDirectory: '/home/uname/Projects/cornflake/web/app/themes',
    });
  });

  it('detects a Composer web-root WordPress themes directory', async () => {
    cwd.mockReturnValue(
      '/home/uname/Projects/cornflake/web/wp-content/themes/my-theme',
    );
    existsSync.mockImplementation(
      (path) =>
        String(path) === '/home/uname/Projects/cornflake/web/wp-content/themes',
    );

    await expect(getWordPressInfo()).resolves.toEqual({
      name: 'wordpress',
      root: '/home/uname/Projects/cornflake',
      emulsifyParentDirectory:
        '/home/uname/Projects/cornflake/web/wp-content/themes',
    });
  });

  it('returns void if no WordPress themes directory is found', async () => {
    cwd.mockReturnValue('/home/uname/Projects/cornflake');
    existsSync.mockReturnValue(false);

    await expect(getWordPressInfo()).resolves.toBe(undefined);
  });
});
