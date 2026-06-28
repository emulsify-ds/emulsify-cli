/**
 * @file Unit tests for the component create handler.
 */

jest.mock('../lib/log', () => jest.fn());
jest.mock('../util/project/getEmulsifyConfig', () => jest.fn());
jest.mock('../util/cache/getJsonFromCachedFile', () => jest.fn());
jest.mock('../util/cache/cloneIntoCache', () => jest.fn());
jest.mock('../util/fs/findFileInCurrentPath', () => jest.fn());
jest.mock('@inquirer/prompts');

import fs from 'fs';
import { pathExists, remove } from 'fs-extra';
import { select, confirm } from '@inquirer/prompts';
import type { EmulsifySystem } from '@emulsify-cli/config';
import log from '../lib/log.js';
import CliError from '../lib/CliError.js';
import { EMULSIFY_SYSTEM_CONFIG_FILE } from '../lib/constants.js';
import getEmulsifyConfig from '../util/project/getEmulsifyConfig.js';
import getJsonFromCachedFile from '../util/cache/getJsonFromCachedFile.js';
import cloneIntoCache from '../util/cache/cloneIntoCache.js';
import findFileInCurrentPath from '../util/fs/findFileInCurrentPath.js';
import componentCreate from './componentCreate.js';

const logMock = log as jest.Mock;
const getEmulsifyConfigMock = getEmulsifyConfig as jest.Mock;
const getJsonFromCachedFileMock = getJsonFromCachedFile as jest.Mock;
const cloneIntoCacheMock = cloneIntoCache as jest.Mock;
const cloneSystemMock = jest.fn();
const findFileInCurrentPathMock = findFileInCurrentPath as jest.Mock;
const pathExistsMock = pathExists as jest.Mock;
const removeMock = remove as jest.Mock;
const selectMock = select as jest.Mock;
const confirmMock = confirm as jest.Mock;
const mkdirMock = fs.promises.mkdir as jest.Mock;
const writeFileMock = fs.promises.writeFile as jest.Mock;
const originalStdinIsTTY = process.stdin.isTTY;

function setStdinIsTTY(value: boolean | undefined) {
  Object.defineProperty(process.stdin, 'isTTY', {
    value,
    configurable: true,
  });
}

function mockComponentExistsWithoutTemplateOverrides() {
  pathExistsMock.mockImplementation(
    (path) => !String(path).includes('/.cli/templates/'),
  );
}

const projectConfigPath = '/project/project.emulsify.json';

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

describe('componentCreate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setStdinIsTTY(true);
    // The handler clones systems through a higher-order cache helper.
    cloneIntoCacheMock.mockReturnValue(cloneSystemMock);
    cloneSystemMock.mockResolvedValue(undefined);
    getEmulsifyConfigMock.mockResolvedValue(projectConfig);
    getJsonFromCachedFileMock.mockResolvedValue(system);
    findFileInCurrentPathMock.mockReturnValue(projectConfigPath);
    pathExistsMock.mockResolvedValue(false);
    removeMock.mockResolvedValue(undefined);
    selectMock.mockResolvedValue('default');
    confirmMock.mockResolvedValue(false);
    mkdirMock.mockResolvedValue(undefined);
    writeFileMock.mockResolvedValue(undefined);
  });

  afterAll(() => {
    setStdinIsTTY(originalStdinIsTTY);
  });

  it('throws when no Emulsify project is detected', async () => {
    getEmulsifyConfigMock.mockResolvedValueOnce(undefined);

    await expect(componentCreate('button', {})).rejects.toThrow(
      'No Emulsify project detected. You must run this command within an existing Emulsify project. For more information about creating Emulsify projects, run "emulsify init --help"',
    );
  });

  it('throws when no system is configured', async () => {
    getEmulsifyConfigMock.mockResolvedValueOnce({
      ...projectConfig,
      system: undefined,
    });

    await expect(componentCreate('button', {})).rejects.toThrow(
      'You must select and install a system before you can create components. To see a list of out-of-the-box systems, run "emulsify system list". You can install a system by running "emulsify system install [name]"',
    );
  });

  it('throws when no variant is configured', async () => {
    getEmulsifyConfigMock.mockResolvedValueOnce({
      ...projectConfig,
      variant: undefined,
    });

    await expect(componentCreate('button', {})).rejects.toThrow(
      'You must select and install a system before you can create components. To see a list of out-of-the-box systems, run "emulsify system list". You can install a system by running "emulsify system install [name]"',
    );
  });

  it('throws when the configured system repository is invalid', async () => {
    getEmulsifyConfigMock.mockResolvedValueOnce({
      ...projectConfig,
      system: {
        repository: 'not-a-git-url',
        checkout: 'main',
      },
    });

    await expect(componentCreate('button', {})).rejects.toThrow(
      'The repository URL must end in .git.',
    );
  });

  it('throws when the configured system repository has no parseable name', async () => {
    getEmulsifyConfigMock.mockResolvedValueOnce({
      ...projectConfig,
      system: {
        repository: 'https://github.com/example/.git',
        checkout: 'main',
      },
    });

    await expect(componentCreate('button', {})).rejects.toThrow(
      'The system specified in your project configuration is not valid. Please make sure your project.emulsify.json file contains a system.repository value that is a valid git url',
    );
  });

  it('throws when the system is not clone-able', async () => {
    cloneSystemMock.mockRejectedValueOnce(new Error('clone failed'));

    await expect(componentCreate('button', {})).rejects.toThrow(
      'The system specified in your project configuration is not clone-able, or has an invalid checkout value.',
    );
  });

  it('throws when the cached system configuration is invalid', async () => {
    getJsonFromCachedFileMock.mockResolvedValueOnce(undefined);

    await expect(componentCreate('button', {})).rejects.toThrow(
      'Unable to load configuration for the compound system. Please make sure the system is installed.',
    );

    expect(getJsonFromCachedFileMock).toHaveBeenCalledWith(
      'systems',
      ['compound'],
      'main',
      EMULSIFY_SYSTEM_CONFIG_FILE,
    );
  });

  it('throws when the configured variant is not found', async () => {
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

    await expect(componentCreate('button', {})).rejects.toThrow(
      'Unable to find configuration for the variant none within the system compound.',
    );
  });

  it('throws a CliError when no component name is provided', async () => {
    await expect(componentCreate('', {})).rejects.toThrow(CliError);
    await expect(componentCreate('', {})).rejects.toThrow(
      'Please specify a name for the new component.',
    );

    expect(logMock).not.toHaveBeenCalled();
    expect(getEmulsifyConfigMock).not.toHaveBeenCalled();
  });

  it('prompts for format and directory when no directory is provided', async () => {
    selectMock.mockResolvedValueOnce('default').mockResolvedValueOnce('base');

    await componentCreate('button', {});

    expect(selectMock).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('Choose the component format:'),
      }),
    );
    expect(selectMock).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining(
          'Choose a directory for the new component:',
        ),
      }),
    );
  });

  it('cancels overwrite when the user declines the confirm prompt', async () => {
    mockComponentExistsWithoutTemplateOverrides();
    confirmMock.mockResolvedValue(false);

    await componentCreate('button', { directory: 'base' });

    expect(confirmMock).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('already exists'),
        default: false,
      }),
    );
    expect(removeMock).not.toHaveBeenCalled();
    expect(logMock).toHaveBeenCalledWith(
      'info',
      'Component creation canceled.',
    );
  });

  it('overwrites an existing component when the user accepts the confirm prompt', async () => {
    mockComponentExistsWithoutTemplateOverrides();
    confirmMock.mockResolvedValue(true);

    await componentCreate('button', { directory: 'base' });

    expect(removeMock).toHaveBeenCalledWith(
      '/project/components/00-base/button',
    );
    expect(logMock).toHaveBeenCalledWith(
      'success',
      expect.stringContaining('Success!'),
    );
  });

  it('creates a component successfully on the happy path', async () => {
    pathExistsMock.mockResolvedValue(false);

    await componentCreate('button', { directory: 'base' });

    expect(mkdirMock).toHaveBeenCalledWith('/project/components/00-base', {
      recursive: true,
    });
    expect(writeFileMock).toHaveBeenCalledWith(
      '/project/components/00-base/button/button.twig',
      expect.stringContaining('button.twig'),
    );
    expect(logMock).toHaveBeenCalledWith(
      'success',
      expect.stringContaining('Success!'),
    );
  });

  it('creates a component non-interactively when flags provide format, directory, and yes', async () => {
    setStdinIsTTY(false);
    mockComponentExistsWithoutTemplateOverrides();

    await componentCreate('button', {
      directory: 'base',
      format: 'sdc',
      yes: true,
    });

    expect(selectMock).not.toHaveBeenCalled();
    expect(confirmMock).not.toHaveBeenCalled();
    expect(removeMock).toHaveBeenCalledWith(
      '/project/components/00-base/button',
    );
    expect(writeFileMock).toHaveBeenCalledWith(
      '/project/components/00-base/button/button.component.yml',
      expect.stringContaining('name: Button'),
    );
    expect(logMock).toHaveBeenCalledWith(
      'success',
      expect.stringContaining('Success!'),
    );
  });

  it('throws generateComponent failures as CliError messages', async () => {
    findFileInCurrentPathMock.mockReturnValueOnce(undefined);

    await expect(
      componentCreate('button', {
        directory: 'base',
        format: 'default',
      }),
    ).rejects.toThrow(
      'Unable to create the button component: Unable to find an Emulsify project to create the component into.',
    );
  });
});
