/**
 * @file Unit tests for the system detach handler.
 */

jest.mock('../lib/log', () => jest.fn());
jest.mock('../util/project/getEmulsifyConfig', () => jest.fn());
jest.mock('../util/project/unsetEmulsifyConfig', () => jest.fn());
jest.mock('@inquirer/prompts');

import { confirm } from '@inquirer/prompts';

import log from '../lib/log.js';
import getEmulsifyConfig from '../util/project/getEmulsifyConfig.js';
import unsetEmulsifyConfig from '../util/project/unsetEmulsifyConfig.js';
import systemDetach from './systemDetach.js';

const confirmMock = confirm as jest.Mock;
const getEmulsifyConfigMock = getEmulsifyConfig as jest.Mock;
const logMock = log as jest.Mock;
const unsetEmulsifyConfigMock = unsetEmulsifyConfig as jest.Mock;
const originalStdinIsTTY = process.stdin.isTTY;

const projectConfig = {
  project: {
    platform: 'none',
    name: 'Fixture Project',
    machineName: 'fixture-project',
  },
  starter: {
    repository: 'https://github.com/emulsify-ds/emulsify-starter.git',
  },
  system: {
    repository: 'https://github.com/example/fixture-system.git',
    checkout: 'main',
  },
  variant: {
    platform: 'none',
    structureImplementations: [
      {
        name: 'components',
        directory: 'components',
      },
    ],
  },
};

function setStdinIsTTY(value: boolean | undefined): void {
  Object.defineProperty(process.stdin, 'isTTY', {
    value,
    configurable: true,
  });
}

function expectNoConfigMutation(): void {
  expect(unsetEmulsifyConfigMock).not.toHaveBeenCalled();
}

describe('systemDetach', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setStdinIsTTY(false);
    confirmMock.mockReset();
    getEmulsifyConfigMock.mockResolvedValue(projectConfig);
    unsetEmulsifyConfigMock.mockResolvedValue(undefined);
  });

  afterAll(() => {
    setStdinIsTTY(originalStdinIsTTY);
  });

  it('confirms interactively, removes only the system keys, and reassures the user', async () => {
    setStdinIsTTY(true);
    confirmMock.mockResolvedValueOnce(true);

    await systemDetach();

    expect(confirmMock).toHaveBeenCalledTimes(1);
    expect(confirmMock).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('fixture-system'),
      }),
    );
    expect(unsetEmulsifyConfigMock).toHaveBeenCalledTimes(1);
    expect(unsetEmulsifyConfigMock).toHaveBeenCalledWith('system', 'variant');
    expect(logMock).toHaveBeenCalledWith(
      'success',
      'Detached the fixture-system system at main. All component files were left in place.',
    );
    expect(logMock).toHaveBeenCalledWith(
      'info',
      'Next: run "emulsify system create" to scaffold your own system repository, then replace its example content with the components preserved in this project.',
    );
  });

  it('uses --yes in a non-interactive terminal without opening a prompt', async () => {
    setStdinIsTTY(undefined);

    await systemDetach({ yes: true });

    expect(confirmMock).not.toHaveBeenCalled();
    expect(unsetEmulsifyConfigMock).toHaveBeenCalledWith('system', 'variant');
    expect(logMock).toHaveBeenCalledWith(
      'success',
      'Detached the fixture-system system at main. All component files were left in place.',
    );
  });

  it('throws a clear error when no Emulsify project is detected', async () => {
    getEmulsifyConfigMock.mockResolvedValueOnce(undefined);

    await expect(systemDetach({ yes: true })).rejects.toMatchObject({
      name: 'CliError',
      message:
        'No Emulsify project detected. Run this command within an existing Emulsify project.',
      exitCode: 1,
    });

    expect(confirmMock).not.toHaveBeenCalled();
    expectNoConfigMutation();
    expect(logMock).not.toHaveBeenCalled();
  });

  it('states plainly when no component system is configured', async () => {
    const { system: _system, ...configWithoutSystem } = projectConfig;
    getEmulsifyConfigMock.mockResolvedValueOnce(configWithoutSystem);

    await expect(systemDetach({ yes: true })).rejects.toMatchObject({
      name: 'CliError',
      message: 'No component system is configured for this Emulsify project.',
      exitCode: 1,
    });

    expect(confirmMock).not.toHaveBeenCalled();
    expectNoConfigMutation();
    expect(logMock).not.toHaveBeenCalled();
  });

  it('leaves the configuration untouched when confirmation is declined', async () => {
    setStdinIsTTY(true);
    confirmMock.mockResolvedValueOnce(false);

    await systemDetach();

    expect(confirmMock).toHaveBeenCalledTimes(1);
    expectNoConfigMutation();
    expect(logMock).toHaveBeenCalledTimes(1);
    expect(logMock).toHaveBeenCalledWith(
      'info',
      'System detach cancelled. No project files were changed.',
    );
  });

  it('fails before prompting or writing in a non-interactive terminal without --yes', async () => {
    setStdinIsTTY(false);

    await expect(systemDetach()).rejects.toMatchObject({
      name: 'CliError',
      message:
        'System detachment requires confirmation in non-interactive mode. Pass --yes to detach the configured system.',
      exitCode: 1,
    });

    expect(confirmMock).not.toHaveBeenCalled();
    expectNoConfigMutation();
    expect(logMock).not.toHaveBeenCalled();
  });

  it('reports a configuration write failure without claiming success', async () => {
    unsetEmulsifyConfigMock.mockRejectedValueOnce(new Error('disk full'));

    await expect(systemDetach({ yes: true })).rejects.toMatchObject({
      name: 'CliError',
      message:
        'Unable to detach the configured system from project.emulsify.json.',
      exitCode: 1,
    });

    expect(unsetEmulsifyConfigMock).toHaveBeenCalledWith('system', 'variant');
    expect(logMock).not.toHaveBeenCalled();
  });

  it.each([
    'https://github.com/example/.git',
    'https://github.com/example/fixture-system',
  ])(
    'uses a safe label when the configured repository name cannot be parsed: %s',
    async (repository) => {
      getEmulsifyConfigMock.mockResolvedValueOnce({
        ...projectConfig,
        system: {
          ...projectConfig.system,
          repository,
        },
      });

      await systemDetach({ yes: true });

      expect(logMock).toHaveBeenCalledWith(
        'success',
        'Detached the configured component system at main. All component files were left in place.',
      );
    },
  );
});
