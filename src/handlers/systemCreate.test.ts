/**
 * @file Unit tests for the system create handler.
 */

jest.mock('../lib/log', () => jest.fn());
jest.mock('../util/fs/writeToJsonFile', () => jest.fn());
jest.mock('../util/system/validateSystemConfig', () => jest.fn());
jest.mock('@inquirer/prompts');

import type { CreateSystemHandlerOptions } from '@emulsify-cli/handlers';

import { checkbox, confirm, input } from '@inquirer/prompts';
import { existsSync, promises as fs } from 'fs';
import { dirname, join, resolve } from 'path';
import { simpleGit } from 'simple-git';

import { EMULSIFY_SYSTEM_CONFIG_FILE } from '../lib/constants.js';
import log from '../lib/log.js';
import writeToJsonFile from '../util/fs/writeToJsonFile.js';
import buildSystemScaffold, {
  type BuildSystemScaffoldOptions,
} from '../util/system/buildSystemScaffold.js';
import validateSystemConfig from '../util/system/validateSystemConfig.js';
import systemCreate, { normalizeSystemName } from './systemCreate.js';

const inputMock = input as jest.Mock;
const checkboxMock = checkbox as jest.Mock;
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

    expect(inputMock).not.toHaveBeenCalled();
    expect(checkboxMock).not.toHaveBeenCalled();
    expect(confirmMock).not.toHaveBeenCalled();
    expect(existsSyncMock).toHaveBeenCalledTimes(1);
    expect(existsSyncMock).toHaveBeenCalledWith(target);
    expect(validateSystemConfigMock).toHaveBeenCalledTimes(1);
    expect(validateSystemConfigMock).toHaveBeenCalledWith(
      scaffold.systemConfig,
    );
    expect(mkdirMock).toHaveBeenCalledTimes(scaffold.files.length + 1);
    expect(mkdirMock).toHaveBeenNthCalledWith(1, target, {
      recursive: true,
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
      });
    }

    expect(simpleGitMock).toHaveBeenCalledTimes(1);
    expect(simpleGitMock).toHaveBeenCalledWith(target);
    expect(gitInitMock).toHaveBeenCalledTimes(1);
    expect(gitInitMock).toHaveBeenCalledWith(false, {
      '--initial-branch': 'main',
    });
    expect(logMock).toHaveBeenNthCalledWith(
      1,
      'success',
      `Created the acme-system system in ${target}.`,
    );
    expect(logMock).toHaveBeenNthCalledWith(
      2,
      'info',
      'Git was initialized on branch main. Review the generated metadata, then commit the scaffold before installing it.',
    );
    expect(logMock).toHaveBeenCalledTimes(2);
  });

  it('prompts for missing values in order and uses the selected values', async () => {
    setStdinIsTTY(true);
    inputMock
      .mockResolvedValueOnce('Fancy_System')
      .mockResolvedValueOnce('/interactive-systems');
    checkboxMock.mockResolvedValueOnce(['drupal', 'wordpress']);
    confirmMock.mockResolvedValueOnce(true);

    await systemCreate(undefined);

    const namePrompt = inputMock.mock.calls[0][0];
    const directoryPrompt = inputMock.mock.calls[1][0];
    const platformPrompt = checkboxMock.mock.calls[0][0];

    expect(inputMock).toHaveBeenCalledTimes(2);
    expect(namePrompt).toMatchObject({
      message: 'System name:',
      default: 'custom-system',
    });
    expect(namePrompt.validate('ValidSystem')).toBe(true);
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
      message: 'Target directory:',
      default: './',
    });
    expect(directoryPrompt.validate('/tmp/systems')).toBe(true);
    expect(directoryPrompt.validate('  ')).toBe(
      'Target directory cannot be empty.',
    );
    expect(checkboxMock).toHaveBeenCalledTimes(1);
    expect(platformPrompt).toMatchObject({
      message: 'Platform targets:',
      choices: [
        {
          name: 'Generic / no platform',
          value: 'none',
          checked: true,
        },
        { name: 'Drupal', value: 'drupal' },
        { name: 'WordPress', value: 'wordpress' },
      ],
    });
    expect(platformPrompt.validate(['drupal'])).toBe(true);
    expect(platformPrompt.validate([])).toBe(
      'Select at least one platform target.',
    );
    expect(confirmMock).toHaveBeenCalledTimes(1);
    expect(confirmMock).toHaveBeenCalledWith({
      message: 'Initialize a Git repository?',
      default: true,
    });

    expect(inputMock.mock.invocationCallOrder[0]).toBeLessThan(
      inputMock.mock.invocationCallOrder[1],
    );
    expect(inputMock.mock.invocationCallOrder[1]).toBeLessThan(
      checkboxMock.mock.invocationCallOrder[0],
    );
    expect(checkboxMock.mock.invocationCallOrder[0]).toBeLessThan(
      confirmMock.mock.invocationCallOrder[0],
    );

    const target = join(resolve('/interactive-systems'), 'fancy-system');
    const scaffold = expectedScaffold({
      name: 'fancy-system',
      homepage: 'https://example.com/fancy-system',
      repository: 'https://github.com/example/fancy-system.git',
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
      homepage: 'https://example.com/custom-system',
      repository: 'https://github.com/example/custom-system.git',
    });

    await systemCreate(undefined, { yes: true });

    expect(inputMock).not.toHaveBeenCalled();
    expect(checkboxMock).not.toHaveBeenCalled();
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

      expect(inputMock).not.toHaveBeenCalled();
      expect(checkboxMock).not.toHaveBeenCalled();
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
    writeFileMock.mockRejectedValueOnce(new Error('disk full'));

    await expect(
      systemCreate('acme-system', { ...explicitOptions, git: true }),
    ).rejects.toMatchObject({
      name: 'CliError',
      message: `Unable to create the system in ${target}: disk full`,
      exitCode: 1,
    });

    expect(writeToJsonFileMock).toHaveBeenCalledTimes(1);
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

  it('skips Git and only logs creation when --no-git is selected', async () => {
    const target = join(parentDirectory, 'acme-system');

    await systemCreate('acme-system', explicitOptions);

    expect(simpleGitMock).not.toHaveBeenCalled();
    expect(gitInitMock).not.toHaveBeenCalled();
    expect(logMock).toHaveBeenCalledTimes(1);
    expect(logMock).toHaveBeenCalledWith(
      'success',
      `Created the acme-system system in ${target}.`,
    );
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
