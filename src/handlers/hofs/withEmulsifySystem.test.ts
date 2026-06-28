/**
 * @file Unit tests for the withEmulsifySystem handler loader.
 */

jest.mock('../../util/project/getEmulsifyConfig', () => jest.fn());
jest.mock('../../util/cache/getJsonFromCachedFile', () => jest.fn());
jest.mock('../../util/cache/cloneIntoCache', () => jest.fn());

import type { EmulsifySystem } from '@emulsify-cli/config';
import { EMULSIFY_SYSTEM_CONFIG_FILE } from '../../lib/constants.js';
import getJsonFromCachedFile from '../../util/cache/getJsonFromCachedFile.js';
import cloneIntoCache from '../../util/cache/cloneIntoCache.js';
import getEmulsifyConfig from '../../util/project/getEmulsifyConfig.js';
import {
  EmulsifySystemError,
  withEmulsifySystem,
} from './withEmulsifySystem.js';

const getEmulsifyConfigMock = getEmulsifyConfig as jest.Mock;
const getJsonFromCachedFileMock = getJsonFromCachedFile as jest.Mock;
const cloneIntoCacheMock = cloneIntoCache as jest.Mock;
const cloneSystemMock = jest.fn();

const projectConfig = {
  project: {
    platform: 'drupal',
    name: 'Cornflake',
    machineName: 'cornflake',
  },
  starter: {
    repository: 'https://github.com/emulsify-ds/emulsify-starter',
  },
  system: {
    repository: 'https://github.com/emulsify-ds/compound.git',
    checkout: 'main',
  },
  variant: {
    platform: 'drupal',
    structureImplementations: [
      {
        name: 'base',
        directory: 'components/00-base',
      },
    ],
  },
};

const variant = {
  platform: 'drupal',
  structureImplementations: projectConfig.variant.structureImplementations,
  components: [
    {
      name: 'button',
      structure: 'base',
    },
  ],
};

const system = {
  name: 'compound',
  homepage: 'https://example.com/compound',
  repository: 'https://github.com/emulsify-ds/compound.git',
  structure: [
    {
      name: 'base',
      description: 'Base components',
    },
  ],
  variants: [variant],
} as EmulsifySystem;

describe('withEmulsifySystem', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // The shared loader clones systems through a higher-order cache helper.
    cloneIntoCacheMock.mockReturnValue(cloneSystemMock);
    cloneSystemMock.mockResolvedValue(undefined);
    getEmulsifyConfigMock.mockResolvedValue(projectConfig);
    getJsonFromCachedFileMock.mockResolvedValue(system);
  });

  it('throws a typed error when no Emulsify project is detected', async () => {
    expect.assertions(2);
    getEmulsifyConfigMock.mockResolvedValueOnce(undefined);

    try {
      await withEmulsifySystem('install components');
    } catch (err) {
      expect(err).toBeInstanceOf(EmulsifySystemError);
      expect(err).toMatchObject({
        message:
          'No Emulsify project detected. You must run this command within an existing Emulsify project. For more information about creating Emulsify projects, run "emulsify init --help"',
      });
    }
  });

  it('throws a typed error when no system is configured', async () => {
    getEmulsifyConfigMock.mockResolvedValueOnce({
      ...projectConfig,
      system: undefined,
    });

    await expect(withEmulsifySystem('list components')).rejects.toThrow(
      'You must select and install a system before you can list components. To see a list of out-of-the-box systems, run "emulsify system list". You can install a system by running "emulsify system install [name]"',
    );
  });

  it('throws a typed error when no variant is configured', async () => {
    getEmulsifyConfigMock.mockResolvedValueOnce({
      ...projectConfig,
      variant: undefined,
    });

    await expect(withEmulsifySystem('create components')).rejects.toThrow(
      'You must select and install a system before you can create components. To see a list of out-of-the-box systems, run "emulsify system list". You can install a system by running "emulsify system install [name]"',
    );
  });

  it('throws a typed error when the configured system repository has no parseable name', async () => {
    getEmulsifyConfigMock.mockResolvedValueOnce({
      ...projectConfig,
      system: {
        repository: 'https://github.com/example/.git',
        checkout: 'main',
      },
    });

    await expect(withEmulsifySystem('install components')).rejects.toThrow(
      'The system specified in your project configuration is not valid. Please make sure your project.emulsify.json file contains a system.repository value that is a valid git url',
    );
  });

  it('preserves malformed repository parser errors', async () => {
    getEmulsifyConfigMock.mockResolvedValueOnce({
      ...projectConfig,
      system: {
        repository: 'not-a-git-url',
        checkout: 'main',
      },
    });

    await expect(withEmulsifySystem('install components')).rejects.toThrow(
      'The repository URL must end in .git.',
    );
  });

  it('throws a typed error when the system is not clone-able', async () => {
    cloneSystemMock.mockRejectedValueOnce(new Error('clone failed'));

    await expect(withEmulsifySystem('install components')).rejects.toThrow(
      'The system specified in your project configuration is not clone-able, or has an invalid checkout value.',
    );
  });

  it('throws a typed error when the cached system configuration is invalid', async () => {
    getJsonFromCachedFileMock.mockResolvedValueOnce(undefined);

    await expect(withEmulsifySystem('install components')).rejects.toThrow(
      'Unable to load configuration for the compound system. Please make sure the system is installed.',
    );
    expect(getJsonFromCachedFileMock).toHaveBeenCalledWith(
      'systems',
      ['compound'],
      'main',
      EMULSIFY_SYSTEM_CONFIG_FILE,
    );
  });

  it('throws a typed error when the configured variant is not found', async () => {
    const wordpressVariant = {
      ...variant,
      platform: 'wordpress',
    };
    getEmulsifyConfigMock.mockResolvedValueOnce({
      ...projectConfig,
      variant: {
        ...projectConfig.variant,
        platform: 'none',
      },
    });
    getJsonFromCachedFileMock.mockResolvedValueOnce({
      ...system,
      variants: [wordpressVariant],
    });

    await expect(withEmulsifySystem('install components')).rejects.toThrow(
      'Unable to find configuration for the variant none within the system compound.',
    );
  });

  it('resolves the Emulsify project, system name, system config, and variant config', async () => {
    await expect(withEmulsifySystem('install components')).resolves.toEqual({
      emulsifyConfig: projectConfig,
      systemName: 'compound',
      systemConf: system,
      variantConf: variant,
    });
    expect(cloneIntoCacheMock).toHaveBeenCalledWith('systems', ['compound']);
    expect(cloneSystemMock).toHaveBeenCalledWith(projectConfig.system);
  });

  it('resolves a selected variant stored as a platform compatibility expression', async () => {
    const expressionProjectConfig = {
      ...projectConfig,
      variant: {
        ...projectConfig.variant,
        platform: 'drupal || wordpress',
      },
    };
    const expressionVariant = {
      ...variant,
      platform: 'drupal || wordpress',
    };
    const expressionSystem = {
      ...system,
      variants: [expressionVariant],
    };
    getEmulsifyConfigMock.mockResolvedValueOnce(expressionProjectConfig);
    getJsonFromCachedFileMock.mockResolvedValueOnce(expressionSystem);

    await expect(withEmulsifySystem('install components')).resolves.toEqual({
      emulsifyConfig: expressionProjectConfig,
      systemName: 'compound',
      systemConf: expressionSystem,
      variantConf: expressionVariant,
    });
  });

  it('falls back to project platform compatibility when the stored variant expression is stale', async () => {
    const staleProjectConfig = {
      ...projectConfig,
      variant: {
        ...projectConfig.variant,
        platform: 'drupal || wordpress',
      },
    };
    getEmulsifyConfigMock.mockResolvedValueOnce(staleProjectConfig);

    await expect(withEmulsifySystem('install components')).resolves.toEqual({
      emulsifyConfig: staleProjectConfig,
      systemName: 'compound',
      systemConf: system,
      variantConf: variant,
    });
  });
});
