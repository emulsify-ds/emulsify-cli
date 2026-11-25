/**
 * @file Unit tests for the component install handler.
 */

jest.mock('../lib/log', () => jest.fn());
jest.mock('../util/project/getEmulsifyConfig', () => jest.fn());
jest.mock('../util/cache/getJsonFromCachedFile', () => jest.fn());
jest.mock('../util/cache/cloneIntoCache', () => jest.fn());
jest.mock('../util/cache/copyItemFromCache', () => jest.fn());
jest.mock('../util/fs/findFileInCurrentPath', () => jest.fn());
jest.mock('../util/project/installDependencies', () => jest.fn());
jest.mock('../lib/session', () => ({ note: jest.fn(), spinner: jest.fn() }));
// The prompt library is ESM-only, so the mock is built from a factory rather
// than automocked from the real module.
jest.mock('@clack/prompts', () => {
  const cancelSymbol = Symbol('clack:cancel');

  return {
    __esModule: true,
    CANCEL_SYMBOL: cancelSymbol,
    isCancel: (value: unknown) => value === cancelSymbol,
    select: jest.fn(),
    confirm: jest.fn(),
  };
});

import { existsSync, promises as fs } from 'fs';
import { pathExists, remove } from 'fs-extra';
import { join, resolve } from 'path';
import { confirm, select } from '@clack/prompts';
import type { EmulsifySystem } from '@emulsify-cli/config';
import log from '../lib/log.js';
import { note, spinner } from '../lib/session.js';
import CliError from '../lib/CliError.js';
import {
  EMULSIFY_PROJECT_CONFIG_FILE,
  EMULSIFY_SYSTEM_CONFIG_FILE,
} from '../lib/constants.js';
import getEmulsifyConfig from '../util/project/getEmulsifyConfig.js';
import getJsonFromCachedFile from '../util/cache/getJsonFromCachedFile.js';
import cloneIntoCache from '../util/cache/cloneIntoCache.js';
import copyItemFromCache from '../util/cache/copyItemFromCache.js';
import findFileInCurrentPath from '../util/fs/findFileInCurrentPath.js';
import installDependencies from '../util/project/installDependencies.js';
import componentInstall from './componentInstall.js';

const logMock = log as jest.Mock;
const noteMock = note as jest.Mock;
const getEmulsifyConfigMock = getEmulsifyConfig as jest.Mock;
const getJsonFromCachedFileMock = getJsonFromCachedFile as jest.Mock;
const cloneIntoCacheMock = cloneIntoCache as jest.Mock;
const cloneSystemMock = jest.fn();
const copyItemFromCacheMock = copyItemFromCache as jest.Mock;
const findFileInCurrentPathMock = findFileInCurrentPath as jest.Mock;
const pathExistsMock = pathExists as jest.Mock;
const confirmMock = confirm as jest.Mock;
const selectMock = select as jest.Mock;
const installDependenciesMock = installDependencies as jest.Mock;
const readFileMock = fs.readFile as jest.Mock;
const writeFileMock = fs.writeFile as jest.Mock;
const renameMock = fs.rename as jest.Mock;
const progress = { start: jest.fn(), stop: jest.fn(), error: jest.fn() };
const originalStdinIsTTY = process.stdin.isTTY;

function setStdinIsTTY(value: boolean | undefined) {
  Object.defineProperty(process.stdin, 'isTTY', {
    value,
    configurable: true,
  });
}

const projectRoot = resolve('/project');
const projectConfigPath = join(projectRoot, 'project.emulsify.json');
const packageJsonPath = join(projectRoot, 'package.json');
const componentPath = (name: string) =>
  join(projectRoot, 'components', '00-base', name);

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
      dependency: ['icon'],
    },
    {
      name: 'icon',
      structure: 'base',
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

function declarePackages(packages: Record<string, Record<string, string>>) {
  getJsonFromCachedFileMock.mockResolvedValueOnce({
    ...system,
    variants: [
      {
        ...variant,
        components: variant.components.map((component) => ({
          ...component,
          npmDependencies: packages[component.name],
        })),
      },
    ],
  });
}

function expectManifestDependencies(dependencies: Record<string, string>) {
  expect(writeFileMock).toHaveBeenCalledTimes(1);
  const [temporaryFile, manifest] = writeFileMock.mock.calls[0];
  expect(JSON.parse(manifest)).toEqual({ name: 'theme', dependencies });
  expect(renameMock).toHaveBeenCalledTimes(1);
  expect(renameMock).toHaveBeenCalledWith(temporaryFile, packageJsonPath);
}

describe('componentInstall', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setStdinIsTTY(true);
    // The handler clones systems through a higher-order cache helper.
    cloneIntoCacheMock.mockReturnValue(cloneSystemMock);
    cloneSystemMock.mockResolvedValue(undefined);
    getEmulsifyConfigMock.mockResolvedValue(projectConfig);
    getJsonFromCachedFileMock.mockResolvedValue(system);
    copyItemFromCacheMock.mockResolvedValue(undefined);
    findFileInCurrentPathMock.mockReturnValue(projectConfigPath);
    pathExistsMock.mockResolvedValue(false);
    confirmMock.mockResolvedValue(false);
    selectMock.mockResolvedValue('card');
    (existsSync as jest.Mock).mockReturnValue(false);
    (fs.stat as jest.Mock).mockResolvedValue({ mode: 0o644 });
    readFileMock.mockResolvedValue('{\n  "name": "theme"\n}\n');
    installDependenciesMock.mockResolvedValue('');
    (spinner as jest.Mock).mockReturnValue(progress);
  });

  afterAll(() => {
    setStdinIsTTY(originalStdinIsTTY);
  });

  it('throws when no Emulsify project is detected', async () => {
    getEmulsifyConfigMock.mockResolvedValueOnce(undefined);

    await expect(componentInstall('button', {})).rejects.toThrow(
      'No Emulsify project detected. You must run this command within an existing Emulsify project. For more information about creating Emulsify projects, run "emulsify init --help"',
    );
  });

  it('throws when no system is configured', async () => {
    getEmulsifyConfigMock.mockResolvedValueOnce({
      ...projectConfig,
      system: undefined,
    });

    await expect(componentInstall('button', {})).rejects.toThrow(
      'You must select and install a system before you can install components. To see a list of out-of-the-box systems, run "emulsify system list". You can install a system by running "emulsify system install [name]"',
    );
  });

  it('throws when no variant is configured', async () => {
    getEmulsifyConfigMock.mockResolvedValueOnce({
      ...projectConfig,
      variant: undefined,
    });

    await expect(componentInstall('button', {})).rejects.toThrow(
      'You must select and install a system before you can install components. To see a list of out-of-the-box systems, run "emulsify system list". You can install a system by running "emulsify system install [name]"',
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

    await expect(componentInstall('button', {})).rejects.toThrow(
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

    await expect(componentInstall('button', {})).rejects.toThrow(
      'The system specified in your project configuration is not valid. Please make sure your project.emulsify.json file contains a system.repository value that is a valid git url',
    );
  });

  it('throws when the system is not clone-able', async () => {
    cloneSystemMock.mockRejectedValueOnce(new Error('clone failed'));

    await expect(componentInstall('button', {})).rejects.toThrow(
      'The system specified in your project configuration is not clone-able, or has an invalid checkout value.',
    );
  });

  it('throws when the cached system configuration is invalid', async () => {
    getJsonFromCachedFileMock.mockResolvedValueOnce(undefined);

    await expect(componentInstall('button', {})).rejects.toThrow(
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

    await expect(componentInstall('button', {})).rejects.toThrow(
      'Unable to find configuration for the variant none within the system compound.',
    );
  });

  it('throws when the cached system has no variants', async () => {
    getJsonFromCachedFileMock.mockResolvedValueOnce({
      ...system,
      variants: undefined,
    });

    await expect(componentInstall('button', {})).rejects.toThrow(
      'Unable to find configuration for the variant drupal within the system compound.',
    );
  });

  it('throws a CliError before loading the system when neither a component name nor all option is provided non-interactively', async () => {
    setStdinIsTTY(false);

    await expect(componentInstall('', { refresh: true })).rejects.toThrow(
      CliError,
    );
    await expect(componentInstall('', { refresh: true })).rejects.toThrow(
      'Please specify a component to install, or pass --all to install all available components.',
    );

    expect(selectMock).not.toHaveBeenCalled();
    expect(logMock).not.toHaveBeenCalled();
    expect(getEmulsifyConfigMock).not.toHaveBeenCalled();
    expect(cloneIntoCacheMock).not.toHaveBeenCalled();
  });

  it('prompts with components from the installed variant and installs the selection', async () => {
    selectMock.mockResolvedValueOnce('button');

    await componentInstall(undefined, { force: true });

    expect(selectMock).toHaveBeenCalledWith({
      message: 'Choose a component to install',
      options: [
        {
          value: 'button',
          label: 'button',
          hint: 'base',
        },
        {
          value: 'icon',
          label: 'icon',
          hint: 'base',
        },
        {
          value: 'card',
          label: 'card',
          hint: 'base',
        },
        {
          value: expect.any(Symbol),
          label: 'Install all available components',
        },
      ],
    });
    expect(copyItemFromCacheMock).toHaveBeenNthCalledWith(
      1,
      'systems',
      ['compound', 'components/00-base', 'button'],
      componentPath('button'),
      true,
    );
    expect(copyItemFromCacheMock).toHaveBeenNthCalledWith(
      2,
      'systems',
      ['compound', 'components/00-base', 'icon'],
      componentPath('icon'),
      true,
    );
  });

  it('installs all components when the interactive all choice is selected', async () => {
    selectMock.mockImplementationOnce(async ({ options }) => {
      return options.at(-1).value;
    });

    await componentInstall(undefined, {});

    expect(copyItemFromCacheMock).toHaveBeenCalledTimes(3);
    expect(copyItemFromCacheMock).toHaveBeenNthCalledWith(
      3,
      'systems',
      ['compound', 'components/00-base', 'card'],
      componentPath('card'),
      true,
    );
  });

  it('throws when the requested component is not found', async () => {
    await expect(componentInstall('missing', {})).rejects.toThrow(
      'Cannot find the definition for component "missing".\n\nRun "emulsify component list" to see the full list.',
    );
  });

  it('installs all components with force when all option is passed', async () => {
    await componentInstall('', { all: true });

    expect(selectMock).not.toHaveBeenCalled();
    expect(copyItemFromCacheMock).toHaveBeenCalledTimes(3);
    expect(copyItemFromCacheMock).toHaveBeenNthCalledWith(
      1,
      'systems',
      ['compound', 'components/00-base', 'button'],
      componentPath('button'),
      true,
    );
    expect(copyItemFromCacheMock).toHaveBeenNthCalledWith(
      3,
      'systems',
      ['compound', 'components/00-base', 'card'],
      componentPath('card'),
      true,
    );
  });

  it('installs a component and its dependencies on the happy path', async () => {
    await expect(componentInstall('button', { force: true })).resolves.toBe(
      'Installed 2 components',
    );

    expect(copyItemFromCacheMock).toHaveBeenNthCalledWith(
      1,
      'systems',
      ['compound', 'components/00-base', 'button'],
      componentPath('button'),
      true,
    );
    expect(copyItemFromCacheMock).toHaveBeenNthCalledWith(
      2,
      'systems',
      ['compound', 'components/00-base', 'icon'],
      componentPath('icon'),
      true,
    );
    expect(logMock).toHaveBeenCalledWith(
      'success',
      'Success! The button component has been added to your project.',
    );
    // The dependency list reads as a block rather than a log line.
    expect(noteMock).toHaveBeenCalledWith('  → icon', 'Also installed');
  });

  it('requests a remote freshness check when refresh is enabled', async () => {
    await componentInstall('button', { force: true, refresh: true });

    expect(cloneIntoCacheMock).toHaveBeenCalledWith('systems', ['compound'], {
      refresh: true,
    });
  });

  it('previews a single component install without copying in dry-run mode', async () => {
    await expect(componentInstall('card', { dryRun: true })).resolves.toBe(
      'Dry run complete',
    );

    expect(confirmMock).not.toHaveBeenCalled();
    expect(copyItemFromCacheMock).not.toHaveBeenCalled();
    expect(logMock).toHaveBeenCalledWith(
      'info',
      expect.stringContaining('Dry run: component install "card"'),
    );
    expect(logMock).toHaveBeenCalledWith(
      'info',
      expect.stringContaining(componentPath('card')),
    );
    expect(logMock).toHaveBeenCalledWith(
      'info',
      expect.stringContaining('Real run would: copy component'),
    );
  });

  it('previews dependency installs without copying in dry-run mode', async () => {
    await componentInstall('button', { dryRun: true });

    expect(confirmMock).not.toHaveBeenCalled();
    expect(copyItemFromCacheMock).not.toHaveBeenCalled();
    expect(logMock).toHaveBeenCalledWith(
      'info',
      expect.stringContaining('Dependencies:\n  - icon'),
    );
    expect(logMock).toHaveBeenCalledWith(
      'info',
      expect.stringContaining('  - icon (dependency of "button")'),
    );
    expect(logMock).toHaveBeenCalledWith(
      'info',
      expect.stringContaining(componentPath('icon')),
    );
  });

  it('previews existing component destinations without prompting in dry-run mode', async () => {
    pathExistsMock.mockResolvedValue(true);

    await componentInstall('card', { dryRun: true });

    expect(confirmMock).not.toHaveBeenCalled();
    expect(copyItemFromCacheMock).not.toHaveBeenCalled();
    expect(logMock).toHaveBeenCalledWith(
      'info',
      expect.stringContaining('Destination exists: yes'),
    );
    expect(logMock).toHaveBeenCalledWith(
      'info',
      expect.stringContaining(
        'Real run would: prompt before replacing or skipping',
      ),
    );
  });

  it('installs a component when no project config path is found for destination checks', async () => {
    findFileInCurrentPathMock.mockReturnValueOnce(undefined);

    await expect(componentInstall('card', {})).resolves.toBe(
      'Installed 1 component',
    );

    expect(copyItemFromCacheMock).toHaveBeenCalledWith(
      'systems',
      ['compound', 'components/00-base', 'card'],
      componentPath('card'),
      false,
    );
  });

  it('prompts and installs when an existing component overwrite is accepted', async () => {
    pathExistsMock.mockResolvedValue(true);
    confirmMock.mockResolvedValue(true);

    await componentInstall('button', {});

    expect(confirmMock).toHaveBeenCalledWith({
      message:
        'The component "button" already exists. Would you like to replace it?',
      initialValue: false,
    });
    expect(copyItemFromCacheMock).toHaveBeenCalledWith(
      'systems',
      ['compound', 'components/00-base', 'button'],
      componentPath('button'),
      true,
    );
  });

  it('does not prompt for overwrite when force is true', async () => {
    pathExistsMock.mockResolvedValue(true);

    await componentInstall('card', { force: true });

    expect(confirmMock).not.toHaveBeenCalled();
    expect(copyItemFromCacheMock).toHaveBeenCalledWith(
      'systems',
      ['compound', 'components/00-base', 'card'],
      componentPath('card'),
      true,
    );
  });

  it('includes dependency context when prompting to overwrite a dependency', async () => {
    pathExistsMock
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(true);
    confirmMock.mockResolvedValue(true);

    await componentInstall('button', {});

    expect(confirmMock).toHaveBeenCalledWith({
      message:
        'The component "icon" (required by "button") already exists. Would you like to replace it?',
      initialValue: false,
    });
    expect(copyItemFromCacheMock).toHaveBeenNthCalledWith(
      2,
      'systems',
      ['compound', 'components/00-base', 'icon'],
      componentPath('icon'),
      true,
    );
  });

  it('skips installation when an existing component overwrite is declined', async () => {
    pathExistsMock.mockResolvedValue(true);
    confirmMock.mockResolvedValue(false);

    await expect(componentInstall('button', {})).resolves.toBe(
      'No components were installed',
    );

    expect(logMock).toHaveBeenCalledWith(
      'info',
      'Skipping installation of component "button".',
    );
    expect(copyItemFromCacheMock).not.toHaveBeenCalled();
  });

  it('rejects an existing destination without opening an overwrite prompt when stdin is non-interactive', async () => {
    setStdinIsTTY(false);
    pathExistsMock.mockResolvedValue(true);

    await expect(componentInstall('card', {})).rejects.toThrow(
      'The component "card" already exists. Pass --force to replace existing components in non-interactive mode.',
    );

    expect(confirmMock).not.toHaveBeenCalled();
    expect(copyItemFromCacheMock).not.toHaveBeenCalled();
    expect(logMock).not.toHaveBeenCalled();
  });

  it('reports dependency installation failures and rejects', async () => {
    copyItemFromCacheMock
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('missing dependency'));

    await expect(componentInstall('button', { force: true })).rejects.toThrow(
      'Unable to install icon: missing dependency',
    );

    expect(logMock).toHaveBeenCalledWith(
      'warn',
      'The following dependencies could not be installed:\n  → icon',
    );
  });

  it('reports non-Error dependency installation failures and rejects', async () => {
    copyItemFromCacheMock
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce('missing dependency');

    await expect(componentInstall('button', { force: true })).rejects.toThrow(
      'Unable to install icon: missing dependency',
    );

    expect(logMock).toHaveBeenCalledWith(
      'warn',
      'The following dependencies could not be installed:\n  → icon',
    );
  });

  it('rejects for non-Error root component installation failures', async () => {
    copyItemFromCacheMock.mockRejectedValueOnce('copy failed');

    await expect(componentInstall('button', { force: true })).rejects.toThrow(
      'Unable to install button: copy failed',
    );
  });

  it('rejects for root component installation failures', async () => {
    copyItemFromCacheMock.mockRejectedValueOnce(new Error('copy failed'));

    await expect(componentInstall('button', { force: true })).rejects.toThrow(
      'Unable to install button: copy failed',
    );
  });

  it('settles every --all install before rejecting a partial failure', async () => {
    copyItemFromCacheMock
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('copy failed'))
      .mockResolvedValueOnce(undefined);

    await expect(componentInstall('', { all: true })).rejects.toThrow(
      'Unable to install icon: copy failed',
    );

    expect(logMock).toHaveBeenCalledWith(
      'success',
      'Success! The card component has been added to your project.',
    );
    expect(copyItemFromCacheMock).toHaveBeenCalledTimes(3);
  });

  it('uses the project config path to check existing destinations', async () => {
    await componentInstall('button', {});

    expect(findFileInCurrentPathMock).toHaveBeenCalledWith(
      EMULSIFY_PROJECT_CONFIG_FILE,
    );
    expect(copyItemFromCacheMock).toHaveBeenCalledWith(
      'systems',
      ['compound', 'components/00-base', 'button'],
      componentPath('button'),
      false,
    );
  });

  describe('npm packages', () => {
    it('adds packages from the named component and a dependency whose files are kept', async () => {
      declarePackages({
        button: { popup: '^1.0.0' },
        icon: { swiper: '^11.2.0' },
      });
      pathExistsMock.mockImplementation(
        async (path) => path === componentPath('icon'),
      );

      await expect(componentInstall('button', {})).resolves.toBe(
        'Installed 1 component · added 2 npm packages',
      );

      expect(confirmMock).toHaveBeenCalledWith({
        message:
          'The component "icon" (required by "button") already exists. Would you like to replace it?',
        initialValue: false,
      });
      expect(copyItemFromCacheMock).toHaveBeenCalledTimes(1);
      expect(copyItemFromCacheMock).toHaveBeenCalledWith(
        'systems',
        ['compound', 'components/00-base', 'button'],
        componentPath('button'),
        false,
      );
      expect(readFileMock).toHaveBeenCalledWith(packageJsonPath, 'utf8');
      expect(readFileMock.mock.invocationCallOrder[0]).toBeLessThan(
        confirmMock.mock.invocationCallOrder[0],
      );
      expectManifestDependencies({ popup: '^1.0.0', swiper: '^11.2.0' });
      expect(installDependenciesMock).toHaveBeenCalledTimes(1);
      expect(installDependenciesMock).toHaveBeenCalledWith(projectRoot);
      expect(noteMock).toHaveBeenCalledWith(
        expect.stringMatching(/swiper@\^11\.2\.0 .*added .*needed by icon/u),
        'npm packages',
      );
      expect(progress.start).toHaveBeenCalledWith('Installing npm packages');
      expect(progress.stop).toHaveBeenCalledWith(
        'Installed 2 npm packages with npm',
      );
    });

    it.each(['--all', 'the picker’s install-all choice'])(
      'applies every component’s packages with %s',
      async (mode) => {
        declarePackages({
          icon: { swiper: '^11.2.0' },
          card: { popup: '^1.0.0' },
        });
        if (mode !== '--all') {
          selectMock.mockImplementationOnce(
            async ({ options }) => options.at(-1).value,
          );
        }

        await expect(
          componentInstall(undefined, { all: mode === '--all' }),
        ).resolves.toBe('Installed 3 components · added 2 npm packages');

        expect(copyItemFromCacheMock).toHaveBeenCalledTimes(3);
        expectManifestDependencies({ popup: '^1.0.0', swiper: '^11.2.0' });
        expect(installDependenciesMock).toHaveBeenCalledTimes(1);
        expect(installDependenciesMock).toHaveBeenCalledWith(projectRoot);
      },
    );

    it.each([false, true])(
      'previews every package status without writing with all=%s',
      async (all) => {
        declarePackages({
          icon: { swiper: '^11.2.0', popup: '^1.0.0', menu: '^2.0.0' },
        });
        readFileMock.mockResolvedValue(
          '{"dependencies":{"popup":"^1.2.0","menu":"^1.0.0"}}',
        );

        await expect(
          componentInstall('button', { all, dryRun: true }),
        ).resolves.toBe('Dry run complete');

        expect(logMock).toHaveBeenCalledWith(
          'info',
          expect.stringMatching(/swiper@\^11\.2\.0 .*would add/u),
        );
        expect(logMock).toHaveBeenCalledWith(
          'info',
          expect.stringMatching(/popup@\^1\.0\.0 .*already satisfied/u),
        );
        expect(logMock).toHaveBeenCalledWith(
          'info',
          expect.stringMatching(/menu@\^2\.0\.0 .*needs attention/u),
        );
        expect(confirmMock).not.toHaveBeenCalled();
        expect(copyItemFromCacheMock).not.toHaveBeenCalled();
        expect(writeFileMock).not.toHaveBeenCalled();
        expect(installDependenciesMock).not.toHaveBeenCalled();
      },
    );

    it('reports missing package.json in a dry run without copying or installing', async () => {
      declarePackages({ card: { swiper: '^11.2.0' } });
      readFileMock.mockRejectedValueOnce(
        Object.assign(new Error('missing'), { code: 'ENOENT' }),
      );

      await expect(componentInstall('card', { dryRun: true })).resolves.toBe(
        'Dry run complete',
      );

      expect(logMock).toHaveBeenCalledWith(
        'info',
        expect.stringContaining('package.json missing'),
      );
      expect(logMock).toHaveBeenCalledWith(
        'info',
        expect.stringContaining(`${packageJsonPath} does not exist`),
      );
      expect(copyItemFromCacheMock).not.toHaveBeenCalled();
      expect(writeFileMock).not.toHaveBeenCalled();
      expect(installDependenciesMock).not.toHaveBeenCalled();
    });

    it.each(['ready', 'missing', 'invalid'])(
      'shows one quoted command with --skip-npm when package.json is %s',
      async (manifest) => {
        declarePackages({ card: { swiper: '^11.2.0', popup: '>=1\n<2' } });
        if (manifest === 'missing') {
          readFileMock.mockRejectedValueOnce(
            Object.assign(new Error('missing'), { code: 'ENOENT' }),
          );
        }
        if (manifest === 'invalid')
          readFileMock.mockResolvedValueOnce('broken');

        await expect(componentInstall('card', { skipNpm: true })).resolves.toBe(
          'Installed 1 component',
        );

        expect(copyItemFromCacheMock).toHaveBeenCalledTimes(1);
        expect(noteMock).toHaveBeenCalledWith(
          expect.stringContaining(
            'npm install "swiper@^11.2.0" "popup@>=1 <2"',
          ),
          'npm packages',
        );
        if (manifest !== 'ready') {
          expect(noteMock).toHaveBeenCalledWith(
            expect.stringContaining(`package.json ${manifest}`),
            'npm packages',
          );
        }
        expect(writeFileMock).not.toHaveBeenCalled();
        expect(installDependenciesMock).not.toHaveBeenCalled();
      },
    );

    it('keeps component files and the updated manifest when npm fails', async () => {
      declarePackages({ card: { swiper: '^11.2.0' } });
      installDependenciesMock.mockImplementationOnce(async () => {
        expect(copyItemFromCacheMock).toHaveBeenCalledWith(
          'systems',
          ['compound', 'components/00-base', 'card'],
          componentPath('card'),
          false,
        );
        expectManifestDependencies({ swiper: '^11.2.0' });
        throw new Error('  npm error ERESOLVE\n');
      });

      const install = componentInstall('card', {});

      await expect(install).rejects.toBeInstanceOf(CliError);
      await expect(install).rejects.toThrow(
        `npm install failed:\nnpm error ERESOLVE\nRun npm install in ${projectRoot} to finish installing the packages.`,
      );
      expect(progress.error).toHaveBeenCalledWith(
        'Unable to install npm packages',
      );
      expect(fs.rm).not.toHaveBeenCalled();
      expect(remove).not.toHaveBeenCalled();
      expectManifestDependencies({ swiper: '^11.2.0' });
    });

    it('skips the package step when a component cannot be copied', async () => {
      declarePackages({ icon: { swiper: '^11.2.0' } });
      copyItemFromCacheMock
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('copy failed'));

      await expect(componentInstall('button', {})).rejects.toThrow(
        'Unable to install icon: copy failed',
      );

      expect(readFileMock).toHaveBeenCalledWith(packageJsonPath, 'utf8');
      expect(writeFileMock).not.toHaveBeenCalled();
      expect(installDependenciesMock).not.toHaveBeenCalled();
    });

    it('rejects an invalid declaration before prompting or changing files', async () => {
      declarePackages({ icon: { swiper: 'latest' } });
      pathExistsMock.mockResolvedValue(true);

      const install = componentInstall('button', { skipNpm: true });

      await expect(install).rejects.toBeInstanceOf(CliError);
      await expect(install).rejects.toThrow(
        'System "compound", component "icon", npm package "swiper" must use a valid semver range.',
      );
      expect(confirmMock).not.toHaveBeenCalled();
      expect(copyItemFromCacheMock).not.toHaveBeenCalled();
      expect(readFileMock).not.toHaveBeenCalled();
      expect(writeFileMock).not.toHaveBeenCalled();
      expect(installDependenciesMock).not.toHaveBeenCalled();
    });

    it.each(['missing', 'invalid'])(
      'rejects a %s package.json before prompting or changing files',
      async (manifest) => {
        declarePackages({ card: { swiper: '^11.2.0' } });
        pathExistsMock.mockResolvedValue(true);
        if (manifest === 'missing') {
          readFileMock.mockRejectedValueOnce(
            Object.assign(new Error('missing'), { code: 'ENOENT' }),
          );
        } else {
          readFileMock.mockResolvedValueOnce('broken');
        }

        const install = componentInstall('card', {});

        await expect(install).rejects.toBeInstanceOf(CliError);
        await expect(install).rejects.toThrow(
          `card needs npm packages (swiper@^11.2.0), but ${packageJsonPath}`,
        );
        expect(confirmMock).not.toHaveBeenCalled();
        expect(copyItemFromCacheMock).not.toHaveBeenCalled();
        expect(writeFileMock).not.toHaveBeenCalled();
        expect(installDependenciesMock).not.toHaveBeenCalled();
      },
    );

    it('preserves satisfied and incompatible declarations without running npm', async () => {
      declarePackages({ card: { swiper: '^11.2.0', popup: '^1.0.0' } });
      readFileMock.mockResolvedValue(
        '{"dependencies":{"swiper":"^10.3.0"},"devDependencies":{"popup":"^1.2.0"}}',
      );

      await expect(componentInstall('card', {})).resolves.toBe(
        'Installed 1 component',
      );

      expect(noteMock).toHaveBeenCalledWith(
        expect.stringMatching(/popup@\^1\.0\.0 .*already in package\.json/u),
        'npm packages',
      );
      expect(logMock).toHaveBeenCalledWith(
        'warn',
        expect.stringContaining('npm install "swiper@^11.2.0"'),
      );
      expect(writeFileMock).not.toHaveBeenCalled();
      expect(installDependenciesMock).not.toHaveBeenCalled();
    });

    it('writes package.json and prints the install command for a pnpm project', async () => {
      declarePackages({ card: { swiper: '^11.2.0' } });
      readFileMock.mockResolvedValue(
        '{"name":"theme","packageManager":"pnpm@9.15.0"}',
      );

      await expect(componentInstall('card', {})).resolves.toBe(
        'Installed 1 component · added 1 npm package',
      );

      expect(writeFileMock).toHaveBeenCalledTimes(1);
      expect(JSON.parse(writeFileMock.mock.calls[0][1])).toEqual({
        name: 'theme',
        packageManager: 'pnpm@9.15.0',
        dependencies: { swiper: '^11.2.0' },
      });
      expect(logMock).toHaveBeenCalledWith(
        'info',
        expect.stringContaining('pnpm install'),
      );
      expect(installDependenciesMock).not.toHaveBeenCalled();
    });
  });
});
