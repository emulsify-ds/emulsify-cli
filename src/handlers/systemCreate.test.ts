/**
 * @file Unit tests for the system create handler.
 */

jest.mock('../lib/log', () => jest.fn());
jest.mock('../util/fs/writeToJsonFile', () => jest.fn());
jest.mock('../util/system/validateSystemConfig', () => jest.fn());
jest.mock('@clack/prompts', () => {
  const CANCEL_SYMBOL = Symbol.for('clack:cancel');

  return {
    __esModule: true,
    CANCEL_SYMBOL,
    isCancel: (value: unknown) => value === CANCEL_SYMBOL,
    text: jest.fn(),
    multiselect: jest.fn(),
    confirm: jest.fn(),
    note: jest.fn(),
    intro: jest.fn(),
    outro: jest.fn(),
    cancel: jest.fn(),
    spinner: jest.fn(() => ({
      start: jest.fn(),
      stop: jest.fn(),
      message: jest.fn(),
      cancel: jest.fn(),
      error: jest.fn(),
      clear: jest.fn(),
      isCancelled: false,
    })),
    log: {
      message: jest.fn(),
      info: jest.fn(),
      success: jest.fn(),
      step: jest.fn(),
      warn: jest.fn(),
      warning: jest.fn(),
      error: jest.fn(),
    },
  };
});

import type { CreateSystemHandlerOptions } from '@emulsify-cli/handlers';

import { confirm, multiselect, text } from '@clack/prompts';
import { existsSync, promises as fs } from 'fs';
import { dirname, join, resolve } from 'path';
import { simpleGit } from 'simple-git';

import { EMULSIFY_SYSTEM_CONFIG_FILE } from '../lib/constants.js';
import log from '../lib/log.js';
import expectToContainInOrder from '../testUtils/expectToContainInOrder.js';
import writeToJsonFile from '../util/fs/writeToJsonFile.js';
import buildSystemScaffold, {
  type BuildSystemScaffoldOptions,
} from '../util/system/buildSystemScaffold.js';
import validateSystemConfig from '../util/system/validateSystemConfig.js';
import systemCreate, { normalizeSystemName } from './systemCreate.js';

const textMock = text as jest.Mock;
const multiselectMock = multiselect as jest.Mock;
const confirmMock = confirm as jest.Mock;
const existsSyncMock = existsSync as jest.Mock;
const mkdirMock = fs.mkdir as jest.Mock;
const writeFileMock = fs.writeFile as jest.Mock;
const writeToJsonFileMock = writeToJsonFile as jest.Mock;
const validateSystemConfigMock = validateSystemConfig as jest.Mock;
const logMock = log as jest.Mock;
const simpleGitMock = simpleGit as jest.Mock;
const gitInitMock = simpleGit().init as jest.Mock;
const originalStdinIsTTY = process.stdin.isTTY;

const parentDirectory = resolve('/systems');
const explicitHomepage = 'https://design.example.com/acme-system';
const explicitRepository = 'https://github.com/example-inc/acme-system.git';

const explicitOptions: CreateSystemHandlerOptions = {
  directory: parentDirectory,
  platform: 'drupal || wordpress',
  git: false,
  homepage: explicitHomepage,
  repository: explicitRepository,
};

function setStdinIsTTY(value: boolean | undefined): void {
  Object.defineProperty(process.stdin, 'isTTY', {
    value,
    configurable: true,
  });
}

function expectedScaffold(overrides: Partial<BuildSystemScaffoldOptions> = {}) {
  return buildSystemScaffold({
    name: 'acme-system',
    platform: 'drupal || wordpress',
    homepage: explicitHomepage,
    repository: explicitRepository,
    ...overrides,
  });
}

function expectNoWrites(): void {
  expect(mkdirMock).not.toHaveBeenCalled();
  expect(writeFileMock).not.toHaveBeenCalled();
  expect(writeToJsonFileMock).not.toHaveBeenCalled();
  expect(simpleGitMock).not.toHaveBeenCalled();
}

describe('normalizeSystemName', () => {
  it.each([
    [' Acme System ', 'acme-system'],
    ['AcmeSystem', 'acme-system'],
    ['acme_system', 'acme-system'],
    ['acme--system', 'acme-system'],
  ])('normalizes %j to %j', (name, expected) => {
    expect(normalizeSystemName(name)).toBe(expected);
  });

  it.each(['', '!!', 'x!'])(
    'rejects a name without three machine-name characters: %j',
    (name) => {
      expect(() => normalizeSystemName(name)).toThrow(
        'System name must contain at least three letters or numbers. Pass the [name] positional argument or use --yes for the default.',
      );
    },
  );
});

describe('systemCreate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setStdinIsTTY(false);
    existsSyncMock.mockReturnValue(false);
    mkdirMock.mockResolvedValue(undefined);
    writeFileMock.mockResolvedValue(undefined);
    writeToJsonFileMock.mockResolvedValue(undefined);
    gitInitMock.mockResolvedValue(undefined);
    validateSystemConfigMock.mockImplementation(
      async (systemConfig: unknown) => ({ valid: true, systemConfig }),
    );
  });

  afterAll(() => {
    setStdinIsTTY(originalStdinIsTTY);
  });

  it('creates the exact explicit scaffold without prompting and initializes Git', async () => {
    const target = join(parentDirectory, 'acme-system');
    const scaffold = expectedScaffold();

    await systemCreate('AcmeSystem', {
      ...explicitOptions,
      platform: ' drupal || wordpress || drupal ',
      git: true,
    });

    expect(textMock).not.toHaveBeenCalled();
    expect(multiselectMock).not.toHaveBeenCalled();
    expect(confirmMock).not.toHaveBeenCalled();
    expect(existsSyncMock).toHaveBeenCalledTimes(1);
    expect(existsSyncMock).toHaveBeenCalledWith(target);
    expect(validateSystemConfigMock).toHaveBeenCalledTimes(1);
    expect(validateSystemConfigMock).toHaveBeenCalledWith(
      scaffold.systemConfig,
    );
    expect(mkdirMock).toHaveBeenCalledTimes(scaffold.files.length + 2);
    expect(mkdirMock).toHaveBeenNthCalledWith(1, dirname(target), {
      recursive: true,
    });
    expect(mkdirMock).toHaveBeenNthCalledWith(2, target, {
      recursive: false,
    });
    expect(writeToJsonFileMock).toHaveBeenCalledTimes(1);
    expect(writeToJsonFileMock).toHaveBeenCalledWith(
      join(target, EMULSIFY_SYSTEM_CONFIG_FILE),
      scaffold.systemConfig,
    );
    expect(writeFileMock).toHaveBeenCalledTimes(scaffold.files.length);

    for (const { path, contents } of scaffold.files) {
      const destination = resolve(target, path);
      expect(mkdirMock).toHaveBeenCalledWith(dirname(destination), {
        recursive: true,
      });
      expect(writeFileMock).toHaveBeenCalledWith(destination, contents, {
        encoding: 'utf-8',
        flag: 'wx',
        flush: true,
      });
    }

    expect(simpleGitMock).toHaveBeenCalledTimes(1);
    expect(simpleGitMock).toHaveBeenCalledWith(target);
    expect(gitInitMock).toHaveBeenCalledTimes(1);
    expect(gitInitMock).toHaveBeenCalledWith(false, {
      '--initial-branch': 'main',
    });
    expect(logMock).toHaveBeenCalledWith(
      'info',
      'Git was initialized on branch main. Review the generated metadata, then commit the scaffold before installing it.',
    );
    expect(logMock).toHaveBeenCalledTimes(1);
  });

  it('prompts for missing values in order and uses the selected values', async () => {
    setStdinIsTTY(true);
    textMock
      .mockResolvedValueOnce('Fancy_System')
      .mockResolvedValueOnce('/interactive-systems');
    multiselectMock.mockResolvedValueOnce(['drupal', 'wordpress']);
    confirmMock.mockResolvedValueOnce(true);

    await systemCreate(undefined);

    const namePrompt = textMock.mock.calls[0][0];
    const directoryPrompt = textMock.mock.calls[1][0];
    const platformPrompt = multiselectMock.mock.calls[0][0];

    expect(textMock).toHaveBeenCalledTimes(2);
    expect(namePrompt).toMatchObject({
      message: 'System name',
      defaultValue: 'custom-system',
    });
    expect(namePrompt.validate('ValidSystem')).toBeUndefined();
    expect(namePrompt.validate('!!')).toBe(
      'System name must contain at least three letters or numbers. Pass the [name] positional argument or use --yes for the default.',
    );
    expect(
      namePrompt.validate({
        trim: () => {
          throw 'unexpected validator failure';
        },
      }),
    ).toBe('unexpected validator failure');
    expect(directoryPrompt).toMatchObject({
      message: 'Target directory',
      defaultValue: './',
    });
    expect(directoryPrompt.validate('/tmp/systems')).toBeUndefined();
    expect(directoryPrompt.validate('  ')).toBe(
      'Target directory cannot be empty.',
    );
    expect(multiselectMock).toHaveBeenCalledTimes(1);
    expect(platformPrompt).toMatchObject({
      message: 'Platform targets',
      options: [
        { label: 'Generic / no platform', value: 'none' },
        { label: 'Drupal', value: 'drupal' },
        { label: 'WordPress', value: 'wordpress' },
      ],
      initialValues: ['none'],
    });
    expect(confirmMock).toHaveBeenCalledTimes(1);
    expect(confirmMock).toHaveBeenCalledWith({
      message: 'Initialize a Git repository?',
      initialValue: true,
    });

    expect(textMock.mock.invocationCallOrder[0]).toBeLessThan(
      textMock.mock.invocationCallOrder[1],
    );
    expect(textMock.mock.invocationCallOrder[1]).toBeLessThan(
      multiselectMock.mock.invocationCallOrder[0],
    );
    expect(multiselectMock.mock.invocationCallOrder[0]).toBeLessThan(
      confirmMock.mock.invocationCallOrder[0],
    );

    const target = join(resolve('/interactive-systems'), 'fancy-system');
    const scaffold = expectedScaffold({
      name: 'fancy-system',
      homepage: 'https://TODO.invalid/fancy-system',
      repository: 'https://TODO.invalid/fancy-system.git',
    });
    expect(validateSystemConfigMock).toHaveBeenCalledWith(
      scaffold.systemConfig,
    );
    expect(writeToJsonFileMock).toHaveBeenCalledWith(
      join(target, EMULSIFY_SYSTEM_CONFIG_FILE),
      scaffold.systemConfig,
    );
    expect(simpleGitMock).toHaveBeenCalledWith(target);
  });

  it('uses every default with --yes without consulting terminal state', async () => {
    setStdinIsTTY(undefined);
    const target = join(resolve('./'), 'custom-system');
    const scaffold = expectedScaffold({
      name: 'custom-system',
      platform: 'none',
      homepage: 'https://TODO.invalid/custom-system',
      repository: 'https://TODO.invalid/custom-system.git',
    });

    await systemCreate(undefined, { yes: true });

    expect(textMock).not.toHaveBeenCalled();
    expect(multiselectMock).not.toHaveBeenCalled();
    expect(confirmMock).not.toHaveBeenCalled();
    expect(existsSyncMock).toHaveBeenCalledWith(target);
    expect(writeToJsonFileMock).toHaveBeenCalledWith(
      join(target, EMULSIFY_SYSTEM_CONFIG_FILE),
      scaffold.systemConfig,
    );
    expect(simpleGitMock).toHaveBeenCalledWith(target);
    expect(gitInitMock).toHaveBeenCalledWith(false, {
      '--initial-branch': 'main',
    });
  });

  it('uses non-resolving TODO metadata when URL options are omitted', async () => {
    const scaffold = expectedScaffold({
      homepage: 'https://TODO.invalid/acme-system',
      repository: 'https://TODO.invalid/acme-system.git',
    });

    await systemCreate('acme-system', {
      directory: parentDirectory,
      platform: 'drupal || wordpress',
      git: false,
    });

    expect(validateSystemConfigMock).toHaveBeenCalledWith(
      scaffold.systemConfig,
    );
    expect(writeToJsonFileMock).toHaveBeenCalledWith(
      join(parentDirectory, 'acme-system', EMULSIFY_SYSTEM_CONFIG_FILE),
      scaffold.systemConfig,
    );
  });

  it.each<{
    label: string;
    name: string | undefined;
    options: CreateSystemHandlerOptions;
    message: string;
  }>([
    {
      label: 'name',
      name: undefined,
      options: {
        directory: parentDirectory,
        platform: 'none',
        git: false,
      },
      message:
        'System name is required in non-interactive mode. Pass the [name] positional argument or use --yes.',
    },
    {
      label: 'target directory',
      name: 'acme-system',
      options: { platform: 'none', git: false },
      message:
        'Target directory is required in non-interactive mode. Pass --directory <directory> or use --yes.',
    },
    {
      label: 'platform',
      name: 'acme-system',
      options: { directory: parentDirectory, git: false },
      message:
        'A platform target is required in non-interactive mode. Pass --platform <platform-expression> or use --yes.',
    },
    {
      label: 'Git choice',
      name: 'acme-system',
      options: { directory: parentDirectory, platform: 'none' },
      message:
        'Git initialization choice is required in non-interactive mode. Pass --git or --no-git, or use --yes.',
    },
  ])(
    'rejects a missing $label in a non-interactive terminal before writing',
    async ({ name, options, message }) => {
      await expect(systemCreate(name, options)).rejects.toMatchObject({
        name: 'CliError',
        message,
        exitCode: 1,
      });

      expect(textMock).not.toHaveBeenCalled();
      expect(multiselectMock).not.toHaveBeenCalled();
      expect(confirmMock).not.toHaveBeenCalled();
      expect(existsSyncMock).not.toHaveBeenCalled();
      expect(validateSystemConfigMock).not.toHaveBeenCalled();
      expectNoWrites();
    },
  );

  it('rejects an invalid positional name before checking or writing the target', async () => {
    await expect(systemCreate('x!', explicitOptions)).rejects.toMatchObject({
      name: 'CliError',
      message:
        'System name must contain at least three letters or numbers. Pass the [name] positional argument or use --yes for the default.',
      exitCode: 1,
    });

    expect(existsSyncMock).not.toHaveBeenCalled();
    expect(validateSystemConfigMock).not.toHaveBeenCalled();
    expectNoWrites();
  });

  it('rejects an unsupported platform expression before checking or writing the target', async () => {
    await expect(
      systemCreate('acme-system', {
        ...explicitOptions,
        platform: 'joomla',
      }),
    ).rejects.toMatchObject({
      name: 'CliError',
      message:
        'Unsupported platform expression "joomla". Pass --platform with none, drupal, wordpress, or a supported expression such as "drupal || wordpress".',
      exitCode: 1,
    });

    expect(existsSyncMock).not.toHaveBeenCalled();
    expect(validateSystemConfigMock).not.toHaveBeenCalled();
    expectNoWrites();
  });

  it('rejects an existing target before validation or writes', async () => {
    const target = join(parentDirectory, 'acme-system');
    existsSyncMock.mockReturnValueOnce(true);

    await expect(
      systemCreate('acme-system', explicitOptions),
    ).rejects.toMatchObject({
      name: 'CliError',
      message: `The system target is already occupied: ${target}. Choose another parent directory with --directory.`,
      exitCode: 1,
    });

    expect(existsSyncMock).toHaveBeenCalledWith(target);
    expect(validateSystemConfigMock).not.toHaveBeenCalled();
    expectNoWrites();
  });

  it.each([
    {
      targetExists: false,
      git: true,
      targetState: 'would be created',
      gitAction: 'would initialize a repository on branch main',
      realRunAction: 'create the system scaffold',
    },
    {
      targetExists: true,
      git: false,
      targetState: 'exists',
      gitAction: 'would not initialize a repository',
      realRunAction: 'refuse because the target is already occupied',
    },
  ])(
    'reports the complete plan without writes when target existence is $targetExists',
    async ({ targetExists, git, targetState, gitAction, realRunAction }) => {
      const target = join(parentDirectory, 'acme-system');
      const scaffold = expectedScaffold();
      existsSyncMock.mockReturnValueOnce(targetExists);

      await systemCreate('acme-system', {
        ...explicitOptions,
        git,
        dryRun: true,
      });

      expect(validateSystemConfigMock).toHaveBeenCalledWith(
        scaffold.systemConfig,
      );
      expectNoWrites();
      expect(logMock).toHaveBeenCalledTimes(1);
      expect(logMock).toHaveBeenCalledWith('info', expect.any(String));

      const message = logMock.mock.calls[0][1] as string;
      expectToContainInOrder(message, [
        'Dry run: system create',
        `Target: ${target} (${targetState})`,
        'Platform: drupal || wordpress',
        `Git: ${gitAction}`,
        `Real run would: ${realRunAction}`,
        'Generated files:',
        EMULSIFY_SYSTEM_CONFIG_FILE,
        'README.md',
        'No directories or files were written, and Git was not initialized.',
      ]);
    },
  );

  it('refuses a target that appears after the initial existence check', async () => {
    const target = join(parentDirectory, 'acme-system');
    mkdirMock
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(
        Object.assign(new Error('exists'), { code: 'EEXIST' }),
      );

    await expect(
      systemCreate('acme-system', explicitOptions),
    ).rejects.toMatchObject({
      name: 'CliError',
      message: `The system target became occupied during creation: ${target}. No existing files were replaced.`,
      exitCode: 1,
    });

    expect(mkdirMock).toHaveBeenNthCalledWith(1, dirname(target), {
      recursive: true,
    });
    expect(mkdirMock).toHaveBeenNthCalledWith(2, target, {
      recursive: false,
    });
    expect(writeFileMock).not.toHaveBeenCalled();
    expect(simpleGitMock).not.toHaveBeenCalled();
    expect(logMock).not.toHaveBeenCalled();
  });

  it('wraps a non-collision target reservation failure', async () => {
    const target = join(parentDirectory, 'acme-system');
    mkdirMock
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('directory is read-only'));

    await expect(
      systemCreate('acme-system', explicitOptions),
    ).rejects.toMatchObject({
      name: 'CliError',
      message: `Unable to create the system in ${target}: directory is read-only`,
      exitCode: 1,
    });

    expect(writeFileMock).not.toHaveBeenCalled();
    expect(simpleGitMock).not.toHaveBeenCalled();
    expect(logMock).not.toHaveBeenCalled();
  });

  it.each([
    {
      errors: [
        { instancePath: '/name', message: 'must match pattern' },
        { instancePath: '', message: undefined },
      ],
      detail: '/name must match pattern; / is invalid',
    },
    {
      errors: undefined,
      detail: 'unknown schema validation error',
    },
  ])(
    'rejects a scaffold that fails schema validation: $detail',
    async ({ errors, detail }) => {
      validateSystemConfigMock.mockResolvedValueOnce({
        valid: false,
        errors,
      });

      await expect(
        systemCreate('acme-system', explicitOptions),
      ).rejects.toMatchObject({
        name: 'CliError',
        message: `Unable to create an invalid system scaffold: ${detail}`,
        exitCode: 1,
      });

      expect(validateSystemConfigMock).toHaveBeenCalledTimes(1);
      expectNoWrites();
      expect(logMock).not.toHaveBeenCalled();
    },
  );

  it('wraps an artifact write failure and does not initialize Git or log success', async () => {
    const target = join(parentDirectory, 'acme-system');
    writeFileMock.mockImplementation(
      async (destination: string): Promise<void> => {
        if (destination.endsWith('README.md')) {
          throw new Error('disk full');
        }
      },
    );

    await expect(
      systemCreate('acme-system', { ...explicitOptions, git: true }),
    ).rejects.toMatchObject({
      name: 'CliError',
      message: `Unable to create the system in ${target}: disk full`,
      exitCode: 1,
    });

    expect(writeFileMock).toHaveBeenCalled();
    expect(simpleGitMock).not.toHaveBeenCalled();
    expect(logMock).not.toHaveBeenCalled();
  });

  it('wraps a system config write failure', async () => {
    const target = join(parentDirectory, 'acme-system');
    writeToJsonFileMock.mockRejectedValueOnce(
      new Error('configuration is read-only'),
    );

    await expect(
      systemCreate('acme-system', explicitOptions),
    ).rejects.toMatchObject({
      name: 'CliError',
      message: `Unable to create the system in ${target}: configuration is read-only`,
      exitCode: 1,
    });

    expect(simpleGitMock).not.toHaveBeenCalled();
    expect(logMock).not.toHaveBeenCalled();
  });

  it('does not replace a scaffold file that appears during creation', async () => {
    const target = join(parentDirectory, 'acme-system');
    const artifactPath = join(target, 'README.md');
    writeFileMock.mockImplementation(
      async (destination: string): Promise<void> => {
        if (destination === artifactPath) {
          throw Object.assign(new Error('already exists'), { code: 'EEXIST' });
        }
      },
    );

    await expect(
      systemCreate('acme-system', explicitOptions),
    ).rejects.toMatchObject({
      name: 'CliError',
      message: `System scaffold file "${artifactPath}" appeared during creation and was not replaced. The target may contain a partial scaffold; remove it before retrying.`,
      exitCode: 1,
    });

    expect(writeFileMock).toHaveBeenCalledWith(
      artifactPath,
      expect.any(String),
      {
        encoding: 'utf-8',
        flag: 'wx',
        flush: true,
      },
    );
    expect(simpleGitMock).not.toHaveBeenCalled();
    expect(logMock).not.toHaveBeenCalled();
  });

  it('skips Git and only logs creation when --no-git is selected', async () => {
    const target = join(parentDirectory, 'acme-system');

    await expect(systemCreate('acme-system', explicitOptions)).resolves.toBe(
      `Created the acme-system system in ${target}.`,
    );

    expect(simpleGitMock).not.toHaveBeenCalled();
    expect(gitInitMock).not.toHaveBeenCalled();
    expect(logMock).not.toHaveBeenCalled();
  });

  it('wraps Git initialization failure and does not log success', async () => {
    const target = join(parentDirectory, 'acme-system');
    gitInitMock.mockRejectedValueOnce('git command failed');

    await expect(
      systemCreate('acme-system', { ...explicitOptions, git: true }),
    ).rejects.toMatchObject({
      name: 'CliError',
      message: `Unable to create the system in ${target}: git command failed`,
      exitCode: 1,
    });

    expect(simpleGitMock).toHaveBeenCalledWith(target);
    expect(gitInitMock).toHaveBeenCalledWith(false, {
      '--initial-branch': 'main',
    });
    expect(logMock).not.toHaveBeenCalled();
  });
});
