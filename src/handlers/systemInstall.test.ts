/**
 * @file Unit tests for the system install handler.
 */

jest.mock('../lib/log', () => jest.fn());
jest.mock('../util/system/getAvailableSystems', () => jest.fn());
jest.mock('../util/cache/cloneIntoCache', () => jest.fn());
jest.mock('../util/cache/getCachedItemCheckout', () => jest.fn());
jest.mock('../util/getRepositoryLatestTag', () => jest.fn());
jest.mock('../util/project/installComponentFromCache', () => ({
  __esModule: true,
  ...jest.requireActual('../util/project/installComponentFromCache'),
  default: jest.fn(),
}));
jest.mock('../util/project/installGeneralAssetsFromCache', () => jest.fn());
jest.mock('../util/cache/getJsonFromCachedFile', () => jest.fn());
jest.mock('../util/project/setEmulsifyConfig', () => jest.fn());
jest.mock('../util/project/getEmulsifyConfig', () => jest.fn());
jest.mock('../util/fs/findFileInCurrentPath', () => jest.fn());
jest.mock('../util/fs/executeScript', () => jest.fn());
jest.mock('@inquirer/prompts');

import fs from 'fs';
import { join, resolve } from 'path';
import { fileURLToPath } from 'url';
import type { EmulsifySystem, EmulsifyVariant } from '@emulsify-cli/config';
import { confirm, input, select, Separator } from '@inquirer/prompts';
import log from '../lib/log.js';
import {
  EMULSIFY_PROJECT_CONFIG_FILE,
  EMULSIFY_PROJECT_HOOK_FOLDER,
  EMULSIFY_PROJECT_HOOK_SYSTEM_INSTALL,
} from '../lib/constants.js';
import getAvailableSystems from '../util/system/getAvailableSystems.js';
import cloneIntoCache from '../util/cache/cloneIntoCache.js';
import getCachedItemCheckout from '../util/cache/getCachedItemCheckout.js';
import getRepositoryLatestTag from '../util/getRepositoryLatestTag.js';
import installComponentFromCache from '../util/project/installComponentFromCache.js';
import installGeneralAssetsFromCache from '../util/project/installGeneralAssetsFromCache.js';
import getJsonFromCachedFile from '../util/cache/getJsonFromCachedFile.js';
import setEmulsifyConfig from '../util/project/setEmulsifyConfig.js';
import getEmulsifyConfig from '../util/project/getEmulsifyConfig.js';
import findFileInCurrentPath from '../util/fs/findFileInCurrentPath.js';
import executeScript from '../util/fs/executeScript.js';
import systemInstall, {
  formatSystemInstallReview,
  getSystemRepoInfo,
} from './systemInstall.js';

const logMock = log as jest.Mock;
const getAvailableSystemsMock = getAvailableSystems as jest.Mock;
const cloneIntoCacheMock = cloneIntoCache as jest.Mock;
const cloneSystemMock = jest.fn();
const getCachedItemCheckoutMock = getCachedItemCheckout as jest.Mock;
const getRepositoryLatestTagMock = getRepositoryLatestTag as jest.Mock;
const installComponentFromCacheMock = installComponentFromCache as jest.Mock;
const installGeneralAssetsFromCacheMock =
  installGeneralAssetsFromCache as jest.Mock;
const getJsonFromCachedFileMock = getJsonFromCachedFile as jest.Mock;
const setEmulsifyConfigMock = setEmulsifyConfig as jest.Mock;
const getEmulsifyConfigMock = getEmulsifyConfig as jest.Mock;
const findFileInCurrentPathMock = findFileInCurrentPath as jest.Mock;
const executeScriptMock = executeScript as jest.Mock;
const existsSyncMock = fs.existsSync as jest.Mock;
const confirmMock = confirm as jest.Mock;
const inputMock = input as jest.Mock;
const selectMock = select as jest.Mock;
const separatorMock = Separator as unknown as jest.Mock;
const originalStdinIsTTY = process.stdin.isTTY;
const projectRoot = resolve('/project');
const projectConfigPath = join(projectRoot, EMULSIFY_PROJECT_CONFIG_FILE);
const systemInstallHookPath = join(
  projectRoot,
  EMULSIFY_PROJECT_HOOK_FOLDER,
  EMULSIFY_PROJECT_HOOK_SYSTEM_INSTALL,
);

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
};

const variant: EmulsifyVariant = {
  platform: 'drupal',
  structureImplementations: [
    {
      name: 'base',
      directory: 'components/00-base',
    },
  ],
  components: [
    {
      name: 'button',
      structure: 'base',
      required: true,
    },
    {
      name: 'card',
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

const availableSystems = [
  {
    name: 'compound',
    label: 'Compound',
    description: 'Accessible, tested components. Drupal, WordPress, plain.',
    repository: 'https://github.com/emulsify-ds/compound.git',
    platforms: ['none', 'drupal', 'wordpress'],
  },
  {
    name: 'emulsify-ui-kit',
    label: 'Emulsify UI Kit',
    description: 'Broader design-system starter kit.',
    repository: 'https://github.com/emulsify-ds/emulsify-ui-kit.git',
    platforms: ['none', 'drupal', 'wordpress'],
  },
];

const builtInSource = {
  kind: 'built-in' as const,
  reference: availableSystems[0],
};
const customSource = { kind: 'custom' as const };
const cancelSource = { kind: 'cancel' as const };

function wizardHeader(step: number, total?: number): string {
  return `${'Install a component system'.padEnd(60)}${
    total ? `Step ${step} of ${total}` : `Step ${step}`
  }`;
}

function formatChoice(label: string, description: string): string {
  return `${label.padEnd(22)}${description}`;
}

function queueBuiltInWizard({
  variantIndex = 0,
  installAll = false,
  confirmed = true,
}: {
  variantIndex?: number;
  installAll?: boolean;
  confirmed?: boolean;
} = {}): void {
  selectMock
    .mockResolvedValueOnce(builtInSource)
    .mockResolvedValueOnce(variantIndex)
    .mockResolvedValueOnce(installAll);
  confirmMock.mockResolvedValueOnce(confirmed);
}

describe('getSystemRepoInfo', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getAvailableSystemsMock.mockResolvedValue(availableSystems);
  });

  it('returns repository information from explicit repository options', async () => {
    await expect(
      getSystemRepoInfo(undefined, {
        repository: 'https://github.com/example/custom-system.git',
        checkout: 'v1.0.0',
      }),
    ).resolves.toEqual({
      name: 'custom-system',
      repository: 'https://github.com/example/custom-system.git',
      checkout: 'v1.0.0',
    });
  });

  it('returns repository information from a local path without a .git suffix', async () => {
    const repository = resolve('/fixtures/custom-system');

    await expect(
      getSystemRepoInfo(undefined, {
        repository,
        checkout: 'main',
      }),
    ).resolves.toEqual({
      name: 'custom-system',
      repository,
      checkout: 'main',
    });
  });

  it('throws invalid explicit repository URLs', async () => {
    await expect(
      getSystemRepoInfo(undefined, {
        repository: 'https://github.com/example/custom-system',
        checkout: 'v1.0.0',
      }),
    ).rejects.toThrow('The repository URL must end in .git.');
  });

  it('rejects a repository without a checkout instead of falling back to a named system', async () => {
    await expect(
      getSystemRepoInfo('compound', {
        repository: 'https://github.com/example/custom-system.git',
      }),
    ).rejects.toThrow(
      'The --repository option requires --checkout when installing a custom system.',
    );

    expect(getAvailableSystemsMock).not.toHaveBeenCalled();
  });

  it('rejects a checkout without a repository instead of falling back to a named system', async () => {
    await expect(
      getSystemRepoInfo('compound', {
        checkout: 'v1.0.0',
      }),
    ).rejects.toThrow(
      'The --checkout option requires --repository when installing a custom system.',
    );

    expect(getAvailableSystemsMock).not.toHaveBeenCalled();
  });

  it('returns nothing when an explicit repository has no parseable name', async () => {
    await expect(
      getSystemRepoInfo(undefined, {
        repository: 'https://github.com/example/.git',
        checkout: 'v1.0.0',
      }),
    ).resolves.toBeUndefined();
  });

  it('returns repository information from an available system name', async () => {
    await expect(getSystemRepoInfo('compound', {})).resolves.toEqual({
      name: 'compound',
      repository: 'https://github.com/emulsify-ds/compound.git',
    });
  });

  it('returns repository information from the emulsify-ui-kit system name', async () => {
    await expect(getSystemRepoInfo('emulsify-ui-kit', {})).resolves.toEqual({
      name: 'emulsify-ui-kit',
      repository: 'https://github.com/emulsify-ds/emulsify-ui-kit.git',
    });
  });
});

describe('formatSystemInstallReview', () => {
  it('formats a local source, omitted checkout, zero components, and plural asset destinations', () => {
    expect(
      formatSystemInstallReview(
        'Local System',
        '/fixtures/local-system.git',
        undefined,
        { ...variant, platform: 'none' },
        {
          components: [],
          requiredComponentCount: 0,
          totalComponentCount: 2,
          componentParentDestinations: [],
          directoryAssetDestinations: ['assets/fonts/', 'assets/images/'],
          fileAssetDestinations: [],
          directoryAssetCount: 2,
          fileAssetCount: 0,
          totalAssetCount: 2,
        },
        false,
      ),
    ).toBe(`  System         Local System
  Source         /fixtures/local-system
  Component set  Platform-neutral
  Scope          Essentials only
  Will install   0 components  →  none
                 2 asset folders  →  assets/fonts/, assets/images/`);
  });

  it('preserves a root destination marker when formatting component directories', () => {
    expect(
      formatSystemInstallReview(
        'Local System',
        '/fixtures/local-system',
        'main',
        variant,
        {
          components: [variant.components[0]],
          requiredComponentCount: 1,
          totalComponentCount: 2,
          componentParentDestinations: ['.'],
          directoryAssetDestinations: [],
          fileAssetDestinations: [],
          directoryAssetCount: 0,
          fileAssetCount: 0,
          totalAssetCount: 0,
        },
        true,
      ),
    ).toContain('Will install   1 component  →  .');
  });

  it('decodes a file URL source and removes its Git suffix', () => {
    const repository = 'file:///fixtures/local%20system.git';
    const repositoryPath = fileURLToPath(repository).replace(/\.git$/u, '');

    expect(
      formatSystemInstallReview(
        'Local System',
        repository,
        'main',
        variant,
        {
          components: [],
          requiredComponentCount: 0,
          totalComponentCount: 0,
          componentParentDestinations: [],
          directoryAssetDestinations: [],
          fileAssetDestinations: [],
          directoryAssetCount: 0,
          fileAssetCount: 0,
          totalAssetCount: 0,
        },
        false,
      ),
    ).toContain(`Source         ${repositoryPath}`);
  });
});

describe('systemInstall', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    confirmMock.mockReset();
    inputMock.mockReset();
    selectMock.mockReset();
    setStdinIsTTY(false);
    // The handler clones systems through a higher-order cache helper.
    cloneIntoCacheMock.mockReturnValue(cloneSystemMock);
    cloneSystemMock.mockResolvedValue(undefined);
    getAvailableSystemsMock.mockResolvedValue(availableSystems);
    getCachedItemCheckoutMock.mockResolvedValue('main');
    getRepositoryLatestTagMock.mockResolvedValue('v1.0.0');
    installComponentFromCacheMock.mockResolvedValue(undefined);
    installGeneralAssetsFromCacheMock.mockResolvedValue(undefined);
    getJsonFromCachedFileMock.mockResolvedValue(system);
    setEmulsifyConfigMock.mockResolvedValue(undefined);
    getEmulsifyConfigMock.mockResolvedValue(projectConfig);
    // A found project config plus an existing hook covers the optional hook branch.
    findFileInCurrentPathMock.mockReturnValue(projectConfigPath);
    existsSyncMock.mockReturnValue(true);
    executeScriptMock.mockResolvedValue(undefined);
  });

  afterAll(() => {
    setStdinIsTTY(originalStdinIsTTY);
  });

  it('throws when no Emulsify project is detected', async () => {
    getEmulsifyConfigMock.mockResolvedValueOnce(undefined);

    await expect(systemInstall('compound', {})).rejects.toThrow(
      'No Emulsify project detected. You must run this command within an existing Emulsify project. For more information about creating Emulsify projects, run "emulsify init --help"',
    );
  });

  it('throws when a system is already configured', async () => {
    getEmulsifyConfigMock.mockResolvedValueOnce({
      ...projectConfig,
      system: {
        repository: 'https://github.com/emulsify-ds/compound.git',
        checkout: 'main',
      },
    });

    await expect(systemInstall('compound', {})).rejects.toThrow(
      'This Emulsify project already has a component system configured. Run "emulsify component list" to see what is available. To choose a different system, run "emulsify system detach" first.',
    );
  });

  it('renders the step-one catalog, separator, and Cancel choice', async () => {
    setStdinIsTTY(true);
    selectMock.mockResolvedValueOnce(cancelSource);

    await systemInstall(undefined, {});

    expect(selectMock).toHaveBeenCalledTimes(1);
    expect(selectMock).toHaveBeenCalledWith({
      message: 'Which system?',
      choices: [
        {
          name: formatChoice(
            'Compound',
            'Accessible, tested components. Drupal, WordPress, plain.',
          ),
          value: builtInSource,
          short: 'Compound',
        },
        {
          name: formatChoice(
            'Emulsify UI Kit',
            'Broader design-system starter kit.',
          ),
          value: {
            kind: 'built-in',
            reference: availableSystems[1],
          },
          short: 'Emulsify UI Kit',
        },
        {
          name: formatChoice(
            'Bring your own',
            'Install from a git repository you control.',
          ),
          value: customSource,
          short: 'Bring your own',
        },
        expect.any(Separator),
        {
          name: 'Cancel',
          value: cancelSource,
        },
      ],
    });
    expect(separatorMock).toHaveBeenCalledWith('────────────');
    expect(logMock).toHaveBeenCalledWith('info', wizardHeader(1));
    expect(logMock).toHaveBeenCalledWith('info', 'System install cancelled.');
    expect(cloneIntoCacheMock).not.toHaveBeenCalled();
    expect(setEmulsifyConfigMock).not.toHaveBeenCalled();
  });

  it('walks a built-in system through all four guided steps and reviews Essentials', async () => {
    const guidedVariant = {
      ...variant,
      directories: [
        {
          name: 'fonts',
          path: 'assets/fonts',
          destinationPath: 'assets/fonts',
        },
      ],
      files: [
        {
          name: 'tokens',
          path: 'assets/tokens.css',
          destinationPath: 'styles/tokens.css',
        },
      ],
    } as EmulsifyVariant;
    getJsonFromCachedFileMock.mockResolvedValueOnce({
      ...system,
      variants: [guidedVariant],
    });
    setStdinIsTTY(true);
    queueBuiltInWizard();

    await systemInstall(undefined, {});

    expect(selectMock).toHaveBeenCalledTimes(3);
    expect(selectMock).toHaveBeenNthCalledWith(3, {
      message: 'How much do you want to install?',
      choices: [
        {
          name: formatChoice('Essentials only', '1 required component'),
          value: false,
          short: 'Essentials only',
        },
        {
          name: formatChoice('Everything', '2 components'),
          value: true,
          short: 'Everything',
        },
      ],
      default: false,
    });
    expect(confirmMock).toHaveBeenCalledWith({
      message: 'Install now?',
      default: true,
    });
    expect(cloneIntoCacheMock).toHaveBeenCalledWith('systems', ['compound'], {
      refresh: true,
    });
    expect(cloneSystemMock).toHaveBeenCalledWith({
      repository: 'https://github.com/emulsify-ds/compound.git',
      checkout: 'v1.0.0',
    });
    expect(setEmulsifyConfigMock).toHaveBeenCalledWith({
      system: {
        repository: 'https://github.com/emulsify-ds/compound.git',
        checkout: 'v1.0.0',
      },
      variant: {
        platform: 'drupal',
        structureImplementations: variant.structureImplementations,
      },
    });
    expect(installComponentFromCacheMock).toHaveBeenCalledTimes(1);
    expect(installComponentFromCacheMock).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'compound' }),
      guidedVariant,
      'button',
      true,
    );
    expect(logMock).toHaveBeenCalledWith(
      'info',
      'Loading Compound from github.com/emulsify-ds/compound. This may take a moment…',
    );
    expect(logMock).toHaveBeenCalledWith('info', 'Loaded Compound  ·  v1.0.0.');
    expect(logMock).toHaveBeenCalledWith('info', wizardHeader(1));
    expect(logMock).toHaveBeenCalledWith('info', wizardHeader(2, 4));
    expect(logMock).toHaveBeenCalledWith('info', wizardHeader(3, 4));
    expect(logMock).toHaveBeenCalledWith('info', wizardHeader(4, 4));
    expect(logMock).toHaveBeenCalledWith(
      'info',
      `\n  System         Compound  ·  v1.0.0
  Source         github.com/emulsify-ds/compound
  Component set  Drupal
  Scope          Essentials only
  Will install   1 component  →  components/00-base/
                 1 asset folder  →  assets/fonts/
                 1 asset file  →  styles/tokens.css\n`,
    );
    expect(confirmMock.mock.invocationCallOrder[0]).toBeLessThan(
      setEmulsifyConfigMock.mock.invocationCallOrder[0],
    );
    expect(logMock).toHaveBeenCalledWith(
      'success',
      'Successfully installed the Compound system using the Drupal component set.',
    );
  });

  it('declines the final review without mutating project files', async () => {
    setStdinIsTTY(true);
    queueBuiltInWizard({ confirmed: false });

    await systemInstall(undefined, {});

    expect(cloneIntoCacheMock).toHaveBeenCalled();
    expect(getJsonFromCachedFileMock).toHaveBeenCalled();
    expect(logMock).toHaveBeenCalledWith(
      'info',
      'System install cancelled. No project files were changed.',
    );
    expect(setEmulsifyConfigMock).not.toHaveBeenCalled();
    expect(installComponentFromCacheMock).not.toHaveBeenCalled();
    expect(installGeneralAssetsFromCacheMock).not.toHaveBeenCalled();
    expect(executeScriptMock).not.toHaveBeenCalled();
  });

  it('accepts the final guided review with --yes without prompting for confirmation', async () => {
    setStdinIsTTY(true);
    queueBuiltInWizard();

    await systemInstall(undefined, { yes: true });

    expect(confirmMock).not.toHaveBeenCalled();
    expect(logMock).toHaveBeenCalledWith('info', wizardHeader(4, 4));
    expect(setEmulsifyConfigMock).toHaveBeenCalled();
    expect(installComponentFromCacheMock).toHaveBeenCalledWith(
      system,
      variant,
      'button',
      true,
    );
  });

  it('walks a bring-your-own repository through all six guided steps and installs Everything', async () => {
    const repository = 'git@github.com:example/custom-system.git';
    const customSystem = {
      ...system,
      name: 'custom-system',
      repository: 'https://github.com/example/custom-system.git',
    } as EmulsifySystem;
    getJsonFromCachedFileMock.mockResolvedValueOnce(customSystem);
    setStdinIsTTY(true);
    selectMock
      .mockResolvedValueOnce(customSource)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(true);
    inputMock
      .mockResolvedValueOnce(` ${repository} `)
      .mockResolvedValueOnce(' release ');
    confirmMock.mockResolvedValueOnce(true);

    await systemInstall(undefined, {});

    expect(inputMock).toHaveBeenNthCalledWith(1, {
      message: 'Repository URL or local path:',
      validate: expect.any(Function),
    });
    expect(inputMock).toHaveBeenNthCalledWith(2, {
      message: 'Checkout (branch, tag, or commit):',
      validate: expect.any(Function),
    });
    const repositoryValidator = inputMock.mock.calls[0][0].validate;
    expect(
      repositoryValidator('https://github.com/example/custom-system.git'),
    ).toBe(true);
    expect(
      repositoryValidator('https://github.com/example/custom-system'),
    ).toBe('The repository URL must end in .git.');
    expect(repositoryValidator('https://github.com/example/.git')).toBe(
      'Enter a Git repository with a recognizable name.',
    );
    const checkoutValidator = inputMock.mock.calls[1][0].validate;
    expect(checkoutValidator(' ')).toBe('Enter a branch, tag, or commit.');
    expect(checkoutValidator('main')).toBe(true);
    expect(cloneIntoCacheMock).toHaveBeenCalledWith(
      'systems',
      ['custom-system'],
      { refresh: true },
    );
    expect(cloneSystemMock).toHaveBeenCalledWith({
      repository,
      checkout: 'release',
    });
    expect(installComponentFromCacheMock).toHaveBeenCalledTimes(2);
    expect(installComponentFromCacheMock).toHaveBeenNthCalledWith(
      2,
      customSystem,
      variant,
      'card',
      true,
    );
    expect(logMock).toHaveBeenCalledWith('info', wizardHeader(1));
    expect(logMock).toHaveBeenCalledWith('info', wizardHeader(2, 6));
    expect(logMock).toHaveBeenCalledWith('info', wizardHeader(3, 6));
    expect(logMock).toHaveBeenCalledWith('info', wizardHeader(4, 6));
    expect(logMock).toHaveBeenCalledWith('info', wizardHeader(5, 6));
    expect(logMock).toHaveBeenCalledWith('info', wizardHeader(6, 6));
    expect(logMock).toHaveBeenCalledWith(
      'info',
      'Loading the component system from github.com/example/custom-system. This may take a moment…',
    );
    expect(logMock).toHaveBeenCalledWith(
      'info',
      'Loaded Custom System  ·  release.',
    );
    expect(logMock).toHaveBeenCalledWith(
      'info',
      `\n  System         Custom System  ·  release
  Source         github.com/example/custom-system
  Component set  Drupal
  Scope          Everything
  Will install   2 components  →  components/00-base/\n`,
    );
  });

  it('rejects a repository and declared system name mismatch before review or project mutation', async () => {
    const repository = 'https://github.com/example/custom-system.git';
    getJsonFromCachedFileMock.mockResolvedValueOnce({
      ...system,
      name: 'declared-system',
    });
    setStdinIsTTY(true);
    selectMock.mockResolvedValueOnce(customSource);
    inputMock.mockResolvedValueOnce(repository).mockResolvedValueOnce('main');

    await expect(systemInstall(undefined, {})).rejects.toThrow(
      'The repository was cached as "custom-system", but system.emulsify.json declares the system name "declared-system". These names must match so files can be installed safely. Rename the repository or update the system name, then retry.',
    );

    expect(cloneSystemMock).toHaveBeenCalledWith({
      repository,
      checkout: 'main',
    });
    expect(selectMock).toHaveBeenCalledTimes(1);
    expect(confirmMock).not.toHaveBeenCalled();
    expect(findFileInCurrentPathMock).not.toHaveBeenCalled();
    expect(setEmulsifyConfigMock).not.toHaveBeenCalled();
    expect(installComponentFromCacheMock).not.toHaveBeenCalled();
    expect(installGeneralAssetsFromCacheMock).not.toHaveBeenCalled();
    expect(executeScriptMock).not.toHaveBeenCalled();
  });

  it('orders guided component sets by recommendation and defaults to the best match', async () => {
    const genericVariant = { ...variant, platform: 'none' };
    const sharedVariant = {
      ...variant,
      platform: 'drupal || wordpress',
    };
    const exactVariant = { ...variant, platform: 'drupal' };
    const incompatibleVariant = { ...variant, platform: 'wordpress' };
    getJsonFromCachedFileMock.mockResolvedValueOnce({
      ...system,
      variants: [
        genericVariant,
        sharedVariant,
        exactVariant,
        incompatibleVariant,
      ],
    });
    setStdinIsTTY(true);
    selectMock
      .mockResolvedValueOnce(builtInSource)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(false);
    confirmMock.mockResolvedValueOnce(false);

    await systemInstall(undefined, {});

    expect(selectMock).toHaveBeenNthCalledWith(2, {
      message: 'Which component set?',
      choices: [
        {
          name: 'Drupal (drupal) — Recommended · 2 components, 1 required component',
          value: 2,
          short: 'Drupal',
        },
        {
          name: 'Drupal and WordPress (drupal || wordpress) · 2 components, 1 required component',
          value: 1,
          short: 'Drupal and WordPress',
        },
        {
          name: 'Platform-neutral (none) · 2 components, 1 required component',
          value: 0,
          short: 'Platform-neutral',
        },
        {
          name: 'WordPress (wordpress) · 2 components, 1 required component',
          value: 3,
          short: 'WordPress',
        },
      ],
      default: 2,
    });
    expect(setEmulsifyConfigMock).not.toHaveBeenCalled();
  });

  it('does not prompt when a system name is provided', async () => {
    setStdinIsTTY(true);

    await systemInstall('compound', {});

    expect(selectMock).not.toHaveBeenCalled();
  });

  it('rejects a repository without a checkout before installing a named system', async () => {
    await expect(
      systemInstall('compound', {
        repository: 'https://github.com/example/custom-system.git',
      }),
    ).rejects.toThrow(
      'The --repository option requires --checkout when installing a custom system.',
    );

    expect(getAvailableSystemsMock).not.toHaveBeenCalled();
    expect(getRepositoryLatestTagMock).not.toHaveBeenCalled();
    expect(cloneIntoCacheMock).not.toHaveBeenCalled();
    expect(cloneSystemMock).not.toHaveBeenCalled();
  });

  it('rejects a checkout without a repository before prompting for a system', async () => {
    setStdinIsTTY(true);

    await expect(
      systemInstall(undefined, {
        checkout: 'v1.0.0',
      }),
    ).rejects.toThrow(
      'The --checkout option requires --repository when installing a custom system.',
    );

    expect(selectMock).not.toHaveBeenCalled();
    expect(getAvailableSystemsMock).not.toHaveBeenCalled();
    expect(cloneIntoCacheMock).not.toHaveBeenCalled();
  });

  it('throws a helpful error in non-interactive mode when no system is provided', async () => {
    await expect(systemInstall(undefined, {})).rejects.toThrow(
      'No component system source was provided. Pass a built-in system name as the positional argument, or pass both --repository <repository> and --checkout <branch, tag, or commit>.',
    );

    expect(selectMock).not.toHaveBeenCalled();
    expect(getAvailableSystemsMock).not.toHaveBeenCalled();
    expect(cloneIntoCacheMock).not.toHaveBeenCalled();
  });

  describe('guided prompt TTY guards', () => {
    it('rejects the custom repository prompt after stdin stops being interactive', async () => {
      setStdinIsTTY(true);
      selectMock.mockImplementationOnce(async () => {
        setStdinIsTTY(false);
        return customSource;
      });

      await expect(systemInstall(undefined, {})).rejects.toThrow(
        'A custom repository is required in non-interactive mode. Pass --repository <repository>.',
      );

      expect(inputMock).not.toHaveBeenCalled();
      expect(cloneIntoCacheMock).not.toHaveBeenCalled();
    });

    it('rejects the custom checkout prompt after stdin stops being interactive', async () => {
      setStdinIsTTY(true);
      selectMock.mockResolvedValueOnce(customSource);
      inputMock.mockImplementationOnce(async () => {
        setStdinIsTTY(false);
        return 'https://github.com/example/custom-system.git';
      });

      await expect(systemInstall(undefined, {})).rejects.toThrow(
        'A custom checkout is required in non-interactive mode. Pass --checkout <branch, tag, or commit>.',
      );

      expect(inputMock).toHaveBeenCalledTimes(1);
      expect(cloneIntoCacheMock).not.toHaveBeenCalled();
    });

    it('rejects the component-set prompt after stdin stops being interactive', async () => {
      setStdinIsTTY(true);
      selectMock.mockImplementationOnce(async () => {
        setStdinIsTTY(false);
        return builtInSource;
      });

      await expect(systemInstall(undefined, {})).rejects.toThrow(
        'A component set choice is required in non-interactive mode. Pass --variant <platform-expression>. Available component sets: Drupal (drupal).',
      );

      expect(selectMock).toHaveBeenCalledTimes(1);
      expect(cloneIntoCacheMock).toHaveBeenCalled();
      expect(setEmulsifyConfigMock).not.toHaveBeenCalled();
    });

    it('rejects the install-scope prompt after stdin stops being interactive', async () => {
      setStdinIsTTY(true);
      selectMock
        .mockResolvedValueOnce(builtInSource)
        .mockImplementationOnce(async () => {
          setStdinIsTTY(false);
          return 0;
        });

      await expect(systemInstall(undefined, {})).rejects.toThrow(
        'Install scope is required in non-interactive mode. Pass --all to install every component, or provide a system name to install required components only.',
      );

      expect(selectMock).toHaveBeenCalledTimes(2);
      expect(setEmulsifyConfigMock).not.toHaveBeenCalled();
    });

    it('rejects final confirmation after stdin stops being interactive', async () => {
      setStdinIsTTY(true);
      selectMock
        .mockResolvedValueOnce(builtInSource)
        .mockResolvedValueOnce(0)
        .mockImplementationOnce(async () => {
          setStdinIsTTY(false);
          return false;
        });

      await expect(systemInstall(undefined, {})).rejects.toThrow(
        'Installation confirmation is required in non-interactive mode. Pass --yes to accept the reviewed installation.',
      );

      expect(confirmMock).not.toHaveBeenCalled();
      expect(setEmulsifyConfigMock).not.toHaveBeenCalled();
      expect(installComponentFromCacheMock).not.toHaveBeenCalled();
      expect(installGeneralAssetsFromCacheMock).not.toHaveBeenCalled();
    });
  });

  it('fails a guided install before prompting when no component set is compatible', async () => {
    getJsonFromCachedFileMock.mockResolvedValueOnce({
      ...system,
      variants: [{ ...variant, platform: 'wordpress' }],
    });
    setStdinIsTTY(true);
    selectMock.mockResolvedValueOnce(builtInSource);

    await expect(systemInstall(undefined, {})).rejects.toThrow(
      'The Compound system has no component set that works with this Drupal project. Available component sets: WordPress (wordpress). Pass --variant <platform-expression> to choose one explicitly.',
    );

    expect(selectMock).toHaveBeenCalledTimes(1);
    expect(setEmulsifyConfigMock).not.toHaveBeenCalled();
  });

  it('guards the guided review when the project configuration path cannot be found', async () => {
    setStdinIsTTY(true);
    queueBuiltInWizard();
    findFileInCurrentPathMock.mockReturnValueOnce(undefined);

    await expect(systemInstall(undefined, {})).rejects.toThrow(
      'Unable to find the Emulsify project configuration for the installation review.',
    );

    expect(confirmMock).not.toHaveBeenCalled();
    expect(setEmulsifyConfigMock).not.toHaveBeenCalled();
    expect(installComponentFromCacheMock).not.toHaveBeenCalled();
  });

  it('uses explicit variant, all, and yes options to shorten a guided install to two steps', async () => {
    setStdinIsTTY(true);
    selectMock.mockResolvedValueOnce(builtInSource);

    await systemInstall(undefined, {
      variant: 'drupal',
      all: true,
      yes: true,
    });

    expect(selectMock).toHaveBeenCalledTimes(1);
    expect(confirmMock).not.toHaveBeenCalled();
    expect(logMock).toHaveBeenCalledWith('info', wizardHeader(2, 2));
    expect(installComponentFromCacheMock).toHaveBeenCalledTimes(2);
    expect(setEmulsifyConfigMock).toHaveBeenCalled();
  });

  it('throws when no variant can be determined', async () => {
    getEmulsifyConfigMock.mockResolvedValueOnce({
      ...projectConfig,
      project: {
        ...projectConfig.project,
        platform: '',
      },
    });

    await expect(systemInstall('compound', {})).rejects.toThrow(
      'This project does not declare a supported platform. Set project.platform in project.emulsify.json to none, drupal, or wordpress before installing a component system.',
    );
  });

  it('rejects when the system is not clone-able', async () => {
    cloneSystemMock.mockRejectedValueOnce(new Error('clone failed'));

    await expect(systemInstall('compound', {})).rejects.toThrow('clone failed');
  });

  it('throws when the cached system configuration is invalid', async () => {
    getJsonFromCachedFileMock.mockResolvedValueOnce(undefined);

    await expect(systemInstall('compound', {})).rejects.toThrow(
      'The system you attempted to install (compound) is invalid, as it does not contain a valid configuration file.',
    );
  });

  it('preserves install validation output after shared extraction', async () => {
    const consoleErrorMock = jest
      .spyOn(console, 'error')
      .mockImplementation(jest.fn());
    getJsonFromCachedFileMock.mockResolvedValueOnce({
      ...system,
      homepage: 'not-a-uri',
    });

    await expect(systemInstall('compound', {})).rejects.toThrow(
      'The system install failed due to the validation errors reported above. Please fix the errors in the "compound" configuration and try again.',
    );

    expect(consoleErrorMock).toHaveBeenCalledWith(
      'System configuration errors:',
      expect.arrayContaining([
        expect.objectContaining({
          instancePath: '/homepage',
          keyword: 'format',
        }),
      ]),
    );

    consoleErrorMock.mockRestore();
  });

  it('throws validation errors from invalid system variant platform expressions', async () => {
    const consoleErrorMock = jest
      .spyOn(console, 'error')
      .mockImplementation(jest.fn());
    getJsonFromCachedFileMock.mockResolvedValueOnce({
      ...system,
      variants: [
        {
          ...variant,
          platform: 'drupal && wordpress',
        },
      ],
    });

    await expect(systemInstall('compound', {})).rejects.toThrow(
      'The system install failed due to the validation errors reported above. Please fix the errors in the "compound" configuration and try again.',
    );

    expect(consoleErrorMock).toHaveBeenCalled();

    consoleErrorMock.mockRestore();
  });

  it('throws when the requested variant is not found', async () => {
    await expect(
      systemInstall('compound', { variant: 'none' }),
    ).rejects.toThrow(
      'The Compound system has no component set matching --variant "none". Available component sets: Drupal (drupal).',
    );
  });

  it('rejects duplicate exact component sets instead of opening an unnumbered prompt', async () => {
    getJsonFromCachedFileMock.mockResolvedValueOnce({
      ...system,
      variants: [variant, { ...variant }],
    });

    await expect(
      systemInstall('compound', { variant: 'drupal' }),
    ).rejects.toThrow(
      'The Compound system defines more than one component set for --variant "drupal". Ask the system maintainer to give each component set a unique platform expression.',
    );
    expect(selectMock).not.toHaveBeenCalled();
    expect(setEmulsifyConfigMock).not.toHaveBeenCalled();
  });

  it('throws when the system has no variants', async () => {
    getJsonFromCachedFileMock.mockResolvedValueOnce({
      ...system,
      variants: undefined,
    });

    await expect(systemInstall('compound', {})).rejects.toThrow(
      'The Compound system has no component set that works with this Drupal project. Available component sets: none. Pass --variant <platform-expression> to choose one explicitly.',
    );
  });

  it('installs the required components and global assets on the happy path', async () => {
    await systemInstall('compound', {});

    expect(setEmulsifyConfigMock).toHaveBeenCalledWith({
      system: {
        repository: 'https://github.com/emulsify-ds/compound.git',
        checkout: 'v1.0.0',
      },
      variant: {
        platform: 'drupal',
        structureImplementations: variant.structureImplementations,
      },
    });
    expect(installComponentFromCacheMock).toHaveBeenCalledWith(
      system,
      variant,
      'button',
      true,
    );
    expect(installGeneralAssetsFromCacheMock).toHaveBeenCalledWith(
      system,
      variant,
    );
    expect(executeScriptMock).toHaveBeenCalledWith(systemInstallHookPath);
    expect(logMock).toHaveBeenCalledWith(
      'success',
      'Successfully installed the compound system using the drupal variant.',
    );
  });

  it('installs all components when the all option is passed', async () => {
    await systemInstall('compound', { all: true });

    expect(installComponentFromCacheMock).toHaveBeenCalledTimes(2);
    expect(installComponentFromCacheMock).toHaveBeenNthCalledWith(
      2,
      system,
      variant,
      'card',
      true,
    );
  });

  it('uses an explicit variant on the happy path', async () => {
    await systemInstall('compound', { variant: 'drupal' });

    expect(logMock).toHaveBeenCalledWith(
      'success',
      'Successfully installed the compound system using the drupal variant.',
    );
  });

  it('installs a wordpress system variant for a wordpress project', async () => {
    const wordpressVariant = {
      ...variant,
      platform: 'wordpress',
    };
    getEmulsifyConfigMock.mockResolvedValueOnce({
      ...projectConfig,
      project: {
        ...projectConfig.project,
        platform: 'wordpress',
      },
    });
    getJsonFromCachedFileMock.mockResolvedValueOnce({
      ...system,
      variants: [wordpressVariant],
    });

    await systemInstall('compound', {});

    expect(setEmulsifyConfigMock).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: {
          platform: 'wordpress',
          structureImplementations: variant.structureImplementations,
        },
      }),
    );
  });

  it('prefers an exact wordpress variant over shared or generic variants for a wordpress project', async () => {
    const genericVariant = {
      ...variant,
      platform: 'none',
    };
    const sharedVariant = {
      ...variant,
      platform: 'drupal || wordpress',
    };
    const wordpressVariant = {
      ...variant,
      platform: 'wordpress',
    };
    getEmulsifyConfigMock.mockResolvedValueOnce({
      ...projectConfig,
      project: {
        ...projectConfig.project,
        platform: 'wordpress',
      },
    });
    getJsonFromCachedFileMock.mockResolvedValueOnce({
      ...system,
      variants: [genericVariant, sharedVariant, wordpressVariant],
    });

    await systemInstall('compound', {});

    expect(setEmulsifyConfigMock).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: {
          platform: 'wordpress',
          structureImplementations: variant.structureImplementations,
        },
      }),
    );
  });

  it('installs a shared system variant for a drupal project', async () => {
    const expressionVariant = {
      ...variant,
      platform: 'drupal || wordpress',
    };
    getJsonFromCachedFileMock.mockResolvedValueOnce({
      ...system,
      variants: [expressionVariant],
    });

    await systemInstall('compound', {});

    expect(setEmulsifyConfigMock).toHaveBeenCalledWith({
      system: {
        repository: 'https://github.com/emulsify-ds/compound.git',
        checkout: 'v1.0.0',
      },
      variant: {
        platform: 'drupal || wordpress',
        structureImplementations: variant.structureImplementations,
      },
    });
    expect(logMock).toHaveBeenCalledWith(
      'success',
      'Successfully installed the compound system using the drupal || wordpress variant.',
    );
  });

  it('installs a shared system variant for a wordpress project', async () => {
    const expressionVariant = {
      ...variant,
      platform: 'drupal || wordpress',
    };
    getEmulsifyConfigMock.mockResolvedValueOnce({
      ...projectConfig,
      project: {
        ...projectConfig.project,
        platform: 'wordpress',
      },
    });
    getJsonFromCachedFileMock.mockResolvedValueOnce({
      ...system,
      variants: [expressionVariant],
    });

    await systemInstall('compound', {});

    expect(setEmulsifyConfigMock).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: {
          platform: 'drupal || wordpress',
          structureImplementations: variant.structureImplementations,
        },
      }),
    );
  });

  it('prefers a shared expression over a generic none variant for a concrete project', async () => {
    const genericVariant = {
      ...variant,
      platform: 'none',
    };
    const expressionVariant = {
      ...variant,
      platform: 'drupal || wordpress',
    };
    getJsonFromCachedFileMock.mockResolvedValueOnce({
      ...system,
      variants: [genericVariant, expressionVariant],
    });

    await systemInstall('compound', {});

    expect(setEmulsifyConfigMock).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: {
          platform: 'drupal || wordpress',
          structureImplementations: variant.structureImplementations,
        },
      }),
    );
  });

  it.each(['drupal', 'wordpress'] as const)(
    'allows a %s project platform to install a generic none variant',
    async (platform) => {
      const genericVariant = {
        ...variant,
        platform: 'none',
      };
      getEmulsifyConfigMock.mockResolvedValueOnce({
        ...projectConfig,
        project: {
          ...projectConfig.project,
          platform,
        },
      });
      getJsonFromCachedFileMock.mockResolvedValueOnce({
        ...system,
        variants: [genericVariant],
      });

      await systemInstall('compound', {});

      expect(setEmulsifyConfigMock).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: {
            platform: 'none',
            structureImplementations: variant.structureImplementations,
          },
        }),
      );
    },
  );

  it.each(['drupal', 'wordpress'] as const)(
    'allows a none project platform to install a %s-only system variant',
    async (platform) => {
      const platformVariant = {
        ...variant,
        platform,
      };
      getEmulsifyConfigMock.mockResolvedValueOnce({
        ...projectConfig,
        project: {
          ...projectConfig.project,
          platform: 'none',
        },
      });
      getJsonFromCachedFileMock.mockResolvedValueOnce({
        ...system,
        variants: [platformVariant],
      });

      await systemInstall('compound', {});

      expect(setEmulsifyConfigMock).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: {
            platform,
            structureImplementations: variant.structureImplementations,
          },
        }),
      );
    },
  );

  it('throws a clear error when a none project platform matches multiple variants in a non-interactive terminal', async () => {
    getEmulsifyConfigMock.mockResolvedValueOnce({
      ...projectConfig,
      project: {
        ...projectConfig.project,
        platform: 'none',
      },
    });
    getJsonFromCachedFileMock.mockResolvedValueOnce({
      ...system,
      variants: [
        {
          ...variant,
          platform: 'drupal',
        },
        {
          ...variant,
          platform: 'wordpress',
        },
      ],
    });

    await expect(systemInstall('compound', {})).rejects.toThrow(
      'More than one Compound component set works equally well with this Platform-neutral project: Drupal (drupal), WordPress (wordpress). Run this command in an interactive terminal, or pass --variant <platform-expression>.',
    );
  });

  it('prompts when a none project platform matches multiple variants in an interactive terminal', async () => {
    setStdinIsTTY(true);
    selectMock.mockResolvedValueOnce(1);
    getEmulsifyConfigMock.mockResolvedValueOnce({
      ...projectConfig,
      project: {
        ...projectConfig.project,
        platform: 'none',
      },
    });
    getJsonFromCachedFileMock.mockResolvedValueOnce({
      ...system,
      variants: [
        {
          ...variant,
          platform: 'drupal',
        },
        {
          ...variant,
          platform: 'wordpress',
        },
      ],
    });

    await systemInstall('compound', {});

    expect(selectMock).toHaveBeenCalledWith({
      message: 'Which Compound component set should be used?',
      choices: [
        {
          name: 'Drupal (drupal) — Recommended · 2 components, 1 required component',
          value: 0,
          short: 'Drupal',
        },
        {
          name: 'WordPress (wordpress) — Recommended · 2 components, 1 required component',
          value: 1,
          short: 'WordPress',
        },
      ],
      default: 0,
    });
    expect(setEmulsifyConfigMock).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: {
          platform: 'wordpress',
          structureImplementations: variant.structureImplementations,
        },
      }),
    );
  });

  it('allows a none project platform to prefer an exact none variant', async () => {
    const wordpressVariant = {
      ...variant,
      platform: 'wordpress',
    };
    const genericVariant = {
      ...variant,
      platform: 'none',
    };
    getEmulsifyConfigMock.mockResolvedValueOnce({
      ...projectConfig,
      project: {
        ...projectConfig.project,
        platform: 'none',
      },
    });
    getJsonFromCachedFileMock.mockResolvedValueOnce({
      ...system,
      variants: [wordpressVariant, genericVariant],
    });

    await systemInstall('compound', {});

    expect(setEmulsifyConfigMock).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: {
          platform: 'none',
          structureImplementations: variant.structureImplementations,
        },
      }),
    );
  });

  it('installs no required components when none are marked required', async () => {
    getJsonFromCachedFileMock.mockResolvedValueOnce({
      ...system,
      variants: [
        {
          ...variant,
          components: [
            {
              name: 'card',
              structure: 'base',
            },
          ],
        },
      ],
    });

    await systemInstall('compound', {});

    expect(installComponentFromCacheMock).not.toHaveBeenCalled();
    expect(installGeneralAssetsFromCacheMock).toHaveBeenCalled();
  });

  it('fetches the latest tag when a named system has no checkout', async () => {
    await systemInstall('compound', {});

    expect(getRepositoryLatestTagMock).toHaveBeenCalledWith(
      'https://github.com/emulsify-ds/compound.git',
    );
    expect(cloneSystemMock).toHaveBeenCalledWith({
      repository: 'https://github.com/emulsify-ds/compound.git',
      checkout: 'v1.0.0',
    });
  });

  it('uses a configured system checkout without fetching the latest tag', async () => {
    getAvailableSystemsMock.mockResolvedValueOnce([
      {
        name: 'compound',
        repository: 'https://github.com/emulsify-ds/compound.git',
        checkout: 'main',
      },
    ]);

    await systemInstall('compound', {});

    expect(getRepositoryLatestTagMock).not.toHaveBeenCalled();
    expect(cloneSystemMock).toHaveBeenCalledWith({
      repository: 'https://github.com/emulsify-ds/compound.git',
      checkout: 'main',
    });
  });

  it('throws when no matching system repository is found', async () => {
    await expect(systemInstall('missing', {})).rejects.toThrow(
      'Unable to resolve the requested component system source. Pass a valid built-in system name as the positional argument, or pass both --repository <repository> and --checkout <branch, tag, or commit>.',
    );
  });

  it('throws when an explicit repository has no parseable system name', async () => {
    await expect(
      systemInstall(undefined, {
        repository: 'https://github.com/example/.git',
        checkout: 'main',
      }),
    ).rejects.toThrow(
      'Unable to resolve the requested component system source. Pass a valid built-in system name as the positional argument, or pass both --repository <repository> and --checkout <branch, tag, or commit>.',
    );
  });

  it('throws when project configuration cannot be updated', async () => {
    setEmulsifyConfigMock.mockRejectedValueOnce(new Error('write failed'));

    await expect(systemInstall('compound', {})).rejects.toThrow(
      'Unable to update your Emulsify project configuration.',
    );
  });

  it('throws when required components or assets cannot be installed', async () => {
    installComponentFromCacheMock.mockRejectedValueOnce(
      new Error('copy failed'),
    );

    await expect(systemInstall('compound', {})).rejects.toThrow(
      'Unable to install system assets and/or required components: Error: copy failed',
    );
  });

  it('throws when global assets cannot be installed', async () => {
    installGeneralAssetsFromCacheMock.mockRejectedValueOnce(
      new Error('asset failed'),
    );

    await expect(systemInstall('compound', {})).rejects.toThrow(
      'Unable to install system assets and/or required components: Error: asset failed',
    );
  });

  it('uses explicit repository options when provided', async () => {
    setStdinIsTTY(true);
    getJsonFromCachedFileMock.mockResolvedValueOnce({
      ...system,
      name: 'custom-system',
    });

    await systemInstall(undefined, {
      repository: 'https://github.com/example/custom-system.git',
      checkout: 'release',
    });

    expect(selectMock).not.toHaveBeenCalled();
    expect(cloneIntoCacheMock).toHaveBeenCalledWith(
      'systems',
      ['custom-system'],
      { refresh: true },
    );
    expect(cloneSystemMock).toHaveBeenCalledWith({
      repository: 'https://github.com/example/custom-system.git',
      checkout: 'release',
    });
  });

  it('clones an explicit local repository path without a .git suffix', async () => {
    const repository = resolve('/fixtures/custom-system');
    getJsonFromCachedFileMock.mockResolvedValueOnce({
      ...system,
      name: 'custom-system',
    });

    await systemInstall(undefined, {
      repository,
      checkout: 'main',
    });

    expect(cloneIntoCacheMock).toHaveBeenCalledWith(
      'systems',
      ['custom-system'],
      { refresh: true },
    );
    expect(cloneSystemMock).toHaveBeenCalledWith({
      repository,
      checkout: 'main',
    });
  });

  it('uses a cached checkout when no checkout is available after installation', async () => {
    getRepositoryLatestTagMock.mockResolvedValueOnce(undefined);

    await systemInstall('compound', {});

    expect(getCachedItemCheckoutMock).toHaveBeenCalledWith({
      bucket: 'systems',
      itemPath: ['compound'],
      repository: 'https://github.com/emulsify-ds/compound.git',
      checkout: undefined,
    });
    expect(setEmulsifyConfigMock).toHaveBeenCalledWith(
      expect.objectContaining({
        system: {
          repository: 'https://github.com/emulsify-ds/compound.git',
          checkout: 'main',
        },
      }),
    );
  });

  it('throws when neither the latest tag nor cache identifies the loaded checkout', async () => {
    getRepositoryLatestTagMock.mockResolvedValueOnce(undefined);
    getCachedItemCheckoutMock.mockResolvedValueOnce(undefined);

    await expect(systemInstall('compound', {})).rejects.toThrow(
      'Unable to determine which system checkout was loaded. Retry with --checkout <branch, tag, or commit>.',
    );

    expect(cloneSystemMock).toHaveBeenCalledWith({
      repository: 'https://github.com/emulsify-ds/compound.git',
      checkout: undefined,
    });
    expect(setEmulsifyConfigMock).not.toHaveBeenCalled();
  });

  it('skips the install hook when no project config path is found', async () => {
    findFileInCurrentPathMock.mockReturnValueOnce(undefined);

    await systemInstall('compound', {});

    expect(executeScriptMock).not.toHaveBeenCalled();
    expect(findFileInCurrentPathMock).toHaveBeenCalledWith(
      EMULSIFY_PROJECT_CONFIG_FILE,
    );
  });

  it('skips the install hook when the hook file does not exist', async () => {
    existsSyncMock.mockReturnValueOnce(false);

    await systemInstall('compound', {});

    expect(executeScriptMock).not.toHaveBeenCalled();
  });
});
