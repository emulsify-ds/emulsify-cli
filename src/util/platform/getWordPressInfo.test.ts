import process from 'process';
import fs from 'fs';
import { join, resolve } from 'path';
import { clearFoundFileCache } from '../fs/findFileInCurrentPath.js';
import getWordPressInfo from './getWordPressInfo.js';

const cwd = jest.spyOn(process, 'cwd');
const existsSync = jest.spyOn(fs, 'existsSync');
const projectRoot = resolve('fixtures', 'cornflake');

describe('getWordPressInfo', () => {
  beforeEach(() => {
    clearFoundFileCache();
    cwd.mockReset();
    existsSync.mockReset();
  });

  it('detects a standard WordPress themes directory', async () => {
    const themesDirectory = join(projectRoot, 'wp-content', 'themes');
    cwd.mockReturnValue(join(themesDirectory, 'my-theme'));
    existsSync.mockImplementation((path) => String(path) === themesDirectory);

    await expect(getWordPressInfo()).resolves.toEqual({
      name: 'wordpress',
      root: projectRoot,
      emulsifyParentDirectory: themesDirectory,
    });
  });

  it('detects a Bedrock themes directory', async () => {
    const themesDirectory = join(projectRoot, 'web', 'app', 'themes');
    cwd.mockReturnValue(join(themesDirectory, 'my-theme'));
    existsSync.mockImplementation((path) => String(path) === themesDirectory);

    await expect(getWordPressInfo()).resolves.toEqual({
      name: 'wordpress',
      root: projectRoot,
      emulsifyParentDirectory: themesDirectory,
    });
  });

  it('detects a Composer web-root WordPress themes directory', async () => {
    const themesDirectory = join(projectRoot, 'web', 'wp-content', 'themes');
    cwd.mockReturnValue(join(themesDirectory, 'my-theme'));
    existsSync.mockImplementation((path) => String(path) === themesDirectory);

    await expect(getWordPressInfo()).resolves.toEqual({
      name: 'wordpress',
      root: projectRoot,
      emulsifyParentDirectory: themesDirectory,
    });
  });

  it('returns void if no WordPress themes directory is found', async () => {
    cwd.mockReturnValue(projectRoot);
    existsSync.mockReturnValue(false);

    await expect(getWordPressInfo()).resolves.toBe(undefined);
  });
});
