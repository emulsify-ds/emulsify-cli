/**
 * @file Unit tests for the component create handler.
 */

jest.mock('../util/project/getEmulsifyConfig', () => jest.fn());
jest.mock('../util/cache/getJsonFromCachedFile', () => jest.fn());
jest.mock('../util/cache/cloneIntoCache', () => jest.fn());
jest.mock('../util/project/generateComponent', () => jest.fn());
// The prompt library is ESM-only, so the mock is built from a factory rather
// than automocked from the real module.
jest.mock('@clack/prompts', () => {
  const cancelSymbol = Symbol('clack:cancel');

  return {
    __esModule: true,
    CANCEL_SYMBOL: cancelSymbol,
    isCancel: (value: unknown) => value === cancelSymbol,
    text: jest.fn(),
    select: jest.fn(),
    confirm: jest.fn(),
    intro: jest.fn(),
    outro: jest.fn(),
    cancel: jest.fn(),
    note: jest.fn(),
    log: {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      success: jest.fn(),
      message: jest.fn(),
    },
  };
});

import { text } from '@clack/prompts';
import type { EmulsifySystem } from '@emulsify-cli/config';
import CliError from '../lib/CliError.js';
import { EMULSIFY_SYSTEM_CONFIG_FILE } from '../lib/constants.js';
import getEmulsifyConfig from '../util/project/getEmulsifyConfig.js';
import getJsonFromCachedFile from '../util/cache/getJsonFromCachedFile.js';
import cloneIntoCache from '../util/cache/cloneIntoCache.js';
import generateComponent from '../util/project/generateComponent.js';
import { PromptCancelledError } from '../util/prompt/index.js';
import componentCreate from './componentCreate.js';

const getEmulsifyConfigMock = getEmulsifyConfig as jest.Mock;
const getJsonFromCachedFileMock = getJsonFromCachedFile as jest.Mock;
const cloneIntoCacheMock = cloneIntoCache as jest.Mock;
const cloneSystemMock = jest.fn();
const generateComponentMock = generateComponent as jest.Mock;
const textMock = text as jest.Mock;
const originalStdinIsTTY = process.stdin.isTTY;

function setStdinIsTTY(value: boolean | undefined) {
  Object.defineProperty(process.stdin, 'isTTY', {
    value,
    configurable: true,
  });
}

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
    cloneIntoCacheMock.mockReturnValue(cloneSystemMock);
    cloneSystemMock.mockResolvedValue(undefined);
    getEmulsifyConfigMock.mockResolvedValue(projectConfig);
    getJsonFromCachedFileMock.mockResolvedValue(system);
    generateComponentMock.mockResolvedValue('Created the button component');
    textMock.mockResolvedValue('button');
  });

  afterAll(() => {
    setStdinIsTTY(originalStdinIsTTY);
  });

  it('throws when no Emulsify project is detected', async () => {
    getEmulsifyConfigMock.mockResolvedValueOnce(undefined);

    await expect(componentCreate('button', { type: 'twig' })).rejects.toThrow(
      'No Emulsify project detected. You must run this command within an existing Emulsify project. For more information about creating Emulsify projects, run "emulsify init --help"',
    );
  });

  it('throws when no system is configured', async () => {
    getEmulsifyConfigMock.mockResolvedValueOnce({
      ...projectConfig,
      system: undefined,
    });

    await expect(componentCreate('button', { type: 'twig' })).rejects.toThrow(
      'You must select and install a system before you can create components. To see a list of out-of-the-box systems, run "emulsify system list". You can install a system by running "emulsify system install [name]"',
    );
  });

  it('checks for a configured system before prompting for a missing name', async () => {
    getEmulsifyConfigMock.mockResolvedValueOnce({
      ...projectConfig,
      system: undefined,
    });

    await expect(componentCreate(undefined)).rejects.toThrow(
      'You must select and install a system before you can create components.',
    );

    expect(textMock).not.toHaveBeenCalled();
    expect(generateComponentMock).not.toHaveBeenCalled();
  });

  it('throws when no variant is configured', async () => {
    getEmulsifyConfigMock.mockResolvedValueOnce({
      ...projectConfig,
      variant: undefined,
    });

    await expect(componentCreate('button', { type: 'twig' })).rejects.toThrow(
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

    await expect(componentCreate('button', { type: 'twig' })).rejects.toThrow(
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

    await expect(componentCreate('button', { type: 'twig' })).rejects.toThrow(
      'The system specified in your project configuration is not valid. Please make sure your project.emulsify.json file contains a system.repository value that is a valid git url',
    );
  });

  it('throws when the system is not clone-able', async () => {
    cloneSystemMock.mockRejectedValueOnce(new Error('clone failed'));

    await expect(componentCreate('button', { type: 'twig' })).rejects.toThrow(
      'The system specified in your project configuration is not clone-able, or has an invalid checkout value.',
    );
  });

  it('throws when the cached system configuration is invalid', async () => {
    getJsonFromCachedFileMock.mockResolvedValueOnce(undefined);

    await expect(componentCreate('button', { type: 'twig' })).rejects.toThrow(
      'Unable to load configuration for the compound system. Please make sure the system is installed.',
    );

    expect(getJsonFromCachedFileMock).toHaveBeenCalledWith({
      bucket: 'systems',
      itemPath: ['compound'],
      repository: 'https://github.com/emulsify-ds/compound.git',
      checkout: 'main',
      fileName: EMULSIFY_SYSTEM_CONFIG_FILE,
    });
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

    await expect(componentCreate('button', { type: 'twig' })).rejects.toThrow(
      'Unable to find configuration for the variant none within the system compound.',
    );
  });

  it('throws a CliError before loading the system when no component name is provided non-interactively', async () => {
    setStdinIsTTY(false);

    await expect(
      componentCreate('', { refresh: true, type: 'twig' }),
    ).rejects.toThrow(CliError);
    await expect(
      componentCreate('', { refresh: true, type: 'twig' }),
    ).rejects.toThrow('Please specify a name for the new component.');

    expect(textMock).not.toHaveBeenCalled();
    expect(getEmulsifyConfigMock).not.toHaveBeenCalled();
    expect(generateComponentMock).not.toHaveBeenCalled();
  });

  it('prompts for a missing component name and validates it before continuing', async () => {
    textMock.mockImplementationOnce(async ({ validate }) => {
      expect(validate('promo card')).toBe(
        'Component name may only include letters, numbers, and single hyphens between words.',
      );
      expect(validate('---')).toBe(
        'Component name must include at least one letter or number.',
      );
      // A valid name returns no validation message.
      expect(validate('promo-card')).toBeUndefined();
      return 'promo-card';
    });
    const options = { directory: 'base', type: 'twig' };

    await componentCreate(undefined, options);

    expect(textMock).toHaveBeenCalledWith({
      message: 'Component name',
      validate: expect.any(Function),
    });
    expect(generateComponentMock).toHaveBeenCalledWith(
      variant,
      expect.objectContaining(projectConfig),
      'promo-card',
      options,
    );
  });

  it('rejects a missing type before loading the system outside a TTY', async () => {
    setStdinIsTTY(false);

    await expect(
      componentCreate('button', { directory: 'base', refresh: true }),
    ).rejects.toThrow(
      'Component type is required in non-interactive mode. Pass --type <twig|twig-sdc|react|web-component>.',
    );

    expect(getEmulsifyConfigMock).not.toHaveBeenCalled();
    expect(cloneIntoCacheMock).not.toHaveBeenCalled();
    expect(generateComponentMock).not.toHaveBeenCalled();
  });

  it('rejects a missing directory before loading the system outside a TTY', async () => {
    setStdinIsTTY(false);

    await expect(
      componentCreate('button', { type: 'react', refresh: true }),
    ).rejects.toThrow(
      'Component directory is required in non-interactive mode. Pass --directory <directory>.',
    );

    expect(getEmulsifyConfigMock).not.toHaveBeenCalled();
    expect(cloneIntoCacheMock).not.toHaveBeenCalled();
    expect(generateComponentMock).not.toHaveBeenCalled();
  });

  it('passes an interactive missing type through to component generation', async () => {
    const options = { directory: 'base' };

    await componentCreate('button', options);

    expect(generateComponentMock).toHaveBeenCalledWith(
      variant,
      expect.objectContaining(projectConfig),
      'button',
      options,
    );
  });

  it('passes the deprecated format alias through to component generation outside a TTY', async () => {
    setStdinIsTTY(false);
    const options = { directory: 'base', format: 'sdc', yes: true };

    await componentCreate('button', options);

    expect(generateComponentMock).toHaveBeenCalledWith(
      variant,
      expect.objectContaining(projectConfig),
      'button',
      options,
    );
  });

  it('forwards project configuration and all generator options using the new signature', async () => {
    const options = {
      directory: 'base',
      type: 'web-component',
      tagName: 'custom-button',
      yes: true,
      dryRun: true,
      refresh: true,
    };

    await componentCreate('button', options);

    expect(cloneIntoCacheMock).toHaveBeenCalledWith('systems', ['compound'], {
      refresh: true,
    });
    expect(generateComponentMock).toHaveBeenCalledTimes(1);
    expect(generateComponentMock).toHaveBeenCalledWith(
      variant,
      expect.objectContaining(projectConfig),
      'button',
      options,
    );
  });

  it('throws generateComponent failures as CliError messages', async () => {
    generateComponentMock.mockRejectedValueOnce(new Error('generation failed'));

    await expect(
      componentCreate('button', { directory: 'base', type: 'twig' }),
    ).rejects.toThrow(
      'Unable to create the button component: generation failed',
    );
  });

  it('preserves prompt cancellation for the top-level handler', async () => {
    const cancellation = new PromptCancelledError();
    generateComponentMock.mockRejectedValueOnce(cancellation);

    await expect(componentCreate('button', { directory: 'base' })).rejects.toBe(
      cancellation,
    );
  });

  it('summarizes the created component for the session', async () => {
    await expect(
      componentCreate('button', { directory: 'base', type: 'twig' }),
    ).resolves.toBe('Created the button component');
  });

  it('summarizes a dry run without claiming the component was created', async () => {
    generateComponentMock.mockResolvedValueOnce('Dry run complete');

    await expect(
      componentCreate('button', {
        directory: 'base',
        type: 'twig',
        dryRun: true,
      }),
    ).resolves.toBe('Dry run complete');
  });

  it('reports the outcome generateComponent actually reached', async () => {
    // A declined overwrite must not be summarized as a successful creation.
    generateComponentMock.mockResolvedValueOnce(
      'Canceled; the existing button component was kept',
    );

    await expect(
      componentCreate('button', { directory: 'base', type: 'twig' }),
    ).resolves.toBe('Canceled; the existing button component was kept');
  });
});
