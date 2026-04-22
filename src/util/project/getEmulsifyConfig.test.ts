jest.mock('../fs/findFileInCurrentPath', () => jest.fn());
jest.mock('../fs/loadJsonFile', () => jest.fn());

import findFileInCurrentPath from '../fs/findFileInCurrentPath.js';
import loadJsonFile from '../fs/loadJsonFile.js';
import getEmulsifyConfig from './getEmulsifyConfig.js';

const findFileMock = (findFileInCurrentPath as jest.Mock).mockReturnValue(
  '/projects/project.emulsify.json',
);
(loadJsonFile as jest.Mock).mockResolvedValue({
  emulsify: 'config',
});

describe('getEmulsifyConfig', () => {
  it('can load the Emulsify configuration for the project within the users cwd', async () => {
    await expect(getEmulsifyConfig()).resolves.toEqual({
      emulsify: 'config',
    });
  });

  it('returns void if no Emulsify config file is found within the users cwd', async () => {
    findFileMock.mockReturnValueOnce(undefined);
    await expect(getEmulsifyConfig()).resolves.toBe(undefined);
  });

  it('handles errors thrown by findFileInCurrentPath', async () => {
    findFileMock.mockImplementationOnce(() => {
      throw new Error('findFile error');
    });
    await expect(getEmulsifyConfig()).rejects.toThrow('findFile error');
  });

  it('handles errors thrown by loadJsonFile', async () => {
    (loadJsonFile as jest.Mock).mockImplementationOnce(() => {
      throw new Error('loadJsonFile error');
    });
    await expect(getEmulsifyConfig()).rejects.toThrow('loadJsonFile error');
  });

  it('handles invalid JSON structure', async () => {
    (loadJsonFile as jest.Mock).mockResolvedValueOnce({});
    await expect(getEmulsifyConfig()).resolves.toEqual({});
  });
});
