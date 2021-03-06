jest.mock('../fs/findFileInCurrentPath', () => jest.fn());
jest.mock('../fs/loadJsonFile', () => jest.fn());

import findFileInCurrentPath from '../fs/findFileInCurrentPath';
import loadJsonFile from '../fs/loadJsonFile';
import getEmulsifyConfig from './getEmulsifyConfig';

const findFileMock = (findFileInCurrentPath as jest.Mock).mockReturnValue(
  '/projects/emulsify.config.json'
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
});
