jest.mock('../lib/log', () => jest.fn());
jest.mock('../util/platform/getPlatformInfo', () => jest.fn());
jest.mock('../util/cloneRepository', () => jest.fn());
jest.mock('../util/fs/writeToJsonFile', () => jest.fn());

import fs from 'fs';
import log from '../lib/log';
import init from './init';
import getPlatformInfo from '../util/platform/getPlatformInfo';
import cloneRepository from '../util/cloneRepository';
import writeToJsonFile from '../util/fs/writeToJsonFile';

const root = '/home/uname/Projects/cornflake';

const existsSyncMock = jest.spyOn(fs, 'existsSync').mockReturnValue(false);
const getPlatformInfoMock = (getPlatformInfo as jest.Mock).mockReturnValue({
  root,
  name: 'drupal',
  emulsifyParentDirectory: `${root}/themes`,
  platformMajorVersion: 9,
});
const logMock = log as jest.Mock;
const cloneMock = cloneRepository as jest.Mock;
const writeJsonFileMock = writeToJsonFile as jest.Mock;

describe('init', () => {
  beforeEach(() => {
    logMock.mockClear();
    cloneMock.mockClear();
  });

  it('can detect the platform, and use information about the platform to autodetect the target directory and Emulsify starter', async () => {
    expect.assertions(2);
    await init('cornflake');
    expect(
      cloneMock
    ).toHaveBeenCalledWith(
      'https://github.com/emulsify-ds/emulsify-drupal.git',
      '/home/uname/Projects/cornflake/themes/cornflake',
      { checkout: '2.x', shallow: true, removeGitAfterClone: true }
    );
    expect(writeJsonFileMock).toHaveBeenCalledWith(
      '/home/uname/Projects/cornflake/themes/cornflake/emulsify.config.json',
      {
        starter: {
          repository: 'https://github.com/emulsify-ds/emulsify-drupal.git',
        },
      }
    );
  });

  it('can clone an Emulsify starter based on CLI input, and log a success message upon completion', async () => {
    expect.assertions(2);
    await init('cornflake', `${root}/themes/subDir`, {
      starter: 'https://github.com/cornflake-ds/cornflake-drupal.git',
      checkout: '5.6x',
    });
    expect(
      cloneMock
    ).toHaveBeenCalledWith(
      'https://github.com/cornflake-ds/cornflake-drupal.git',
      '/home/uname/Projects/cornflake/themes/subDir/cornflake',
      { checkout: '5.6x', shallow: true, removeGitAfterClone: true }
    );
    expect(logMock).toHaveBeenCalledWith(
      'success',
      'Created an Emulsify project in /home/uname/Projects/cornflake/themes/subDir/cornflake. Enjoy!'
    );
  });

  it('logs a helpful error if the given Emulsify starter is not clone-able', async () => {
    cloneMock.mockRejectedValue(new Error('Does not exist!'));
    await init('cornflake');
    expect(logMock).toHaveBeenCalledWith(
      'error',
      'Unable to pull down https://github.com/emulsify-ds/emulsify-drupal.git: Error: Does not exist!',
      1
    );
  });

  it('logs an error and exits if no target is found or specified', async () => {
    expect.assertions(1);
    getPlatformInfoMock.mockReturnValueOnce(undefined);
    await init('cornflake');
    expect(logMock).toHaveBeenCalledWith(
      'error',
      'Unable to find a directory to put Emulsify in. Please specify a directory using the "path" argument: emulsify init myTheme ./themes',
      1
    );
  });

  it('logs an error and exits if no repository is found or specified', async () => {
    expect.assertions(1);
    getPlatformInfoMock.mockReturnValueOnce(undefined);
    await init('cornflake', root);
    expect(logMock).toHaveBeenCalledWith(
      'error',
      'Unable to find an Emulsify starter for your project. Please specify one using the --starter flag: emulsify init myTheme --starter https://github.com/emulsify-ds/emulsify-drupal.git',
      1
    );
  });

  it('logs an error and exists if the target directory already exists', async () => {
    expect.assertions(1);
    existsSyncMock.mockReturnValueOnce(true);
    await init('cornflake');
    expect(logMock).toHaveBeenCalledWith(
      'error',
      'The intended target is already occupied: /home/uname/Projects/cornflake/themes/cornflake',
      1
    );
  });
});
