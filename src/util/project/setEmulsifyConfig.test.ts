import type { EmulsifyProjectConfiguration } from '@emulsify-cli/config';

jest.mock('../fs/findFileInCurrentPath', () => jest.fn());
jest.mock('../fs/writeToJsonFile', () => jest.fn());
jest.mock('./getEmulsifyConfig', () => jest.fn());

import { EMULSIFY_PROJECT_CONFIG_FILE } from '../../lib/constants';
import findFileInCurrentPath from '../fs/findFileInCurrentPath';
import writeToJsonFile from '../fs/writeToJsonFile';
import getEmulsifyConfig from './getEmulsifyConfig';
import setEmulsifyConfig from './setEmulsifyConfig';

(writeToJsonFile as jest.Mock).mockResolvedValue(undefined);
const findFileMock = (findFileInCurrentPath as jest.Mock).mockReturnValue(
  '/path/project.emulsify.json',
);
const getConfigMock = (getEmulsifyConfig as jest.Mock).mockResolvedValue({
  originalConfig: 'value',
  toOverride: {
    config: 'value',
  },
});

describe('setEmulsifyConfig', () => {
  it('can load Emulsify configuration for the current project, and update it with the given obj', async () => {
    expect.assertions(4);
    await expect(
      setEmulsifyConfig({
        toOverride: {
          config: 'new value',
        },
      } as unknown as EmulsifyProjectConfiguration),
    ).resolves.toBe(undefined);
    expect(findFileMock).toHaveBeenCalledWith(EMULSIFY_PROJECT_CONFIG_FILE);
    expect(getConfigMock).toHaveBeenCalled();
    expect(writeToJsonFile).toHaveBeenCalledWith(
      '/path/project.emulsify.json',
      {
        originalConfig: 'value',
        toOverride: { config: 'new value' },
      },
    );
  });

  it('throws an error if no Emulsify configuration file is found', async () => {
    expect.assertions(1);
    findFileMock.mockReturnValueOnce(undefined);
    await expect(
      setEmulsifyConfig({} as unknown as EmulsifyProjectConfiguration),
    ).rejects.toThrow(
      Error(
        `Unable to set values for ${EMULSIFY_PROJECT_CONFIG_FILE} because you are not in an Emulsify project`,
      ),
    );
  });

  it('throws an error if the existing Emulsify configuration file cannot be loaded', async () => {
    expect.assertions(1);
    getConfigMock.mockReturnValueOnce(undefined);
    await expect(
      setEmulsifyConfig({} as unknown as EmulsifyProjectConfiguration),
    ).rejects.toThrow(
      Error(
        `Unable to set values for ${EMULSIFY_PROJECT_CONFIG_FILE} because you are not in an Emulsify project`,
      ),
    );
  });
});
