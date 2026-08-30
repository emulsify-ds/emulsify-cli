jest.mock('@inquirer/prompts');
jest.mock('../lib/log', () => jest.fn());
jest.mock('../util/fs/findFileInCurrentPath', () => jest.fn());

import { checkbox } from '@inquirer/prompts';
import { promises as fs } from 'fs';
import { dirname, join, resolve } from 'path';
import { pathExists } from 'fs-extra';

import { EMULSIFY_PROJECT_CONFIG_FILE } from '../lib/constants.js';
import log from '../lib/log.js';
import findFileInCurrentPath from '../util/fs/findFileInCurrentPath.js';
import type { ComponentType } from '../util/project/componentTypes.js';
import { buildEjectableComponentTemplates } from '../util/project/componentTemplates/index.js';
import componentEjectTemplates, {
  buildComponentTemplateEjectionPlan,
  CONFLICTING_TEMPLATE_TYPE_ERROR,
  MISSING_TEMPLATE_TYPE_ERROR,
} from './componentEjectTemplates.js';

const checkboxMock = checkbox as jest.Mock;
const findFileMock = findFileInCurrentPath as jest.Mock;
const logMock = log as jest.Mock;
const mkdirMock = fs.mkdir as jest.Mock;
const pathExistsMock = pathExists as jest.Mock;
const writeFileMock = fs.writeFile as jest.Mock;
const originalStdinIsTTY = process.stdin.isTTY;

const projectRoot = resolve('/projects/template-project');
const projectConfigPath = join(projectRoot, EMULSIFY_PROJECT_CONFIG_FILE);
const templatesRoot = join(projectRoot, '.cli', 'templates');

function setStdinIsTTY(value: boolean | undefined): void {
  Object.defineProperty(process.stdin, 'isTTY', {
    value,
    configurable: true,
  });
}

function destination(type: ComponentType, logicalName: string): string {
  return join(templatesRoot, type, logicalName);
}

function expectNoWrites(): void {
  expect(mkdirMock).not.toHaveBeenCalled();
  expect(writeFileMock).not.toHaveBeenCalled();
}

describe('buildComponentTemplateEjectionPlan', () => {
  it('resolves every destination beneath the templates root', () => {
    const plan = buildComponentTemplateEjectionPlan(projectRoot, [
      'twig',
      'react',
    ]);

    expect(plan).toHaveLength(7);
    expect(plan.map(({ destination: target }) => target)).toEqual([
      destination('twig', 'component.twig'),
      destination('twig', 'component.scss'),
      destination('twig', 'component.yml'),
      destination('twig', 'component.stories.js'),
      destination('react', 'component.jsx'),
      destination('react', 'component.scss'),
      destination('react', 'component.stories.jsx'),
    ]);
  });

  it('rejects a type path segment that traverses outside the templates root', () => {
    expect(() =>
      buildComponentTemplateEjectionPlan(projectRoot, [
        '../outside' as ComponentType,
      ]),
    ).toThrow('outside the expected root');
  });
});

describe('componentEjectTemplates', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setStdinIsTTY(false);
    findFileMock.mockReturnValue(projectConfigPath);
    pathExistsMock.mockResolvedValue(false);
    mkdirMock.mockResolvedValue(undefined);
    writeFileMock.mockResolvedValue(undefined);
  });

  afterAll(() => {
    setStdinIsTTY(originalStdinIsTTY);
  });

  it('writes the exact logical templates for an explicit type', async () => {
    await componentEjectTemplates('twig');

    const artifacts = buildEjectableComponentTemplates('twig');
    expect(checkboxMock).not.toHaveBeenCalled();
    expect(pathExistsMock).toHaveBeenCalledTimes(artifacts.length);
    expect(mkdirMock).toHaveBeenCalledTimes(artifacts.length);
    expect(writeFileMock).toHaveBeenCalledTimes(artifacts.length);

    for (const artifact of artifacts) {
      const target = destination('twig', artifact.logicalName);
      expect(mkdirMock).toHaveBeenCalledWith(dirname(target), {
        recursive: true,
      });
      expect(writeFileMock).toHaveBeenCalledWith(target, artifact.contents, {
        encoding: 'utf-8',
        flag: 'wx',
      });
    }

    expect(logMock).toHaveBeenNthCalledWith(
      1,
      'success',
      expect.stringContaining(destination('twig', 'component.twig')),
    );
    expect(logMock).toHaveBeenNthCalledWith(
      2,
      'info',
      'Edit these files to customize component create. Delete an override to restore its built-in template.',
    );
  });

  it('writes all 15 templates without prompting when --all is passed', async () => {
    await componentEjectTemplates(undefined, { all: true });

    expect(checkboxMock).not.toHaveBeenCalled();
    expect(pathExistsMock).toHaveBeenCalledTimes(15);
    expect(mkdirMock).toHaveBeenCalledTimes(15);
    expect(writeFileMock).toHaveBeenCalledTimes(15);
    expect(writeFileMock).toHaveBeenCalledWith(
      destination('twig', 'component.twig'),
      expect.any(String),
      { encoding: 'utf-8', flag: 'wx' },
    );
    expect(writeFileMock).toHaveBeenCalledWith(
      destination('web-component', 'component.stories.js'),
      expect.any(String),
      { encoding: 'utf-8', flag: 'wx' },
    );
  });

  it('rejects combining an explicit type with --all before project lookup', async () => {
    await expect(
      componentEjectTemplates('twig', { all: true }),
    ).rejects.toMatchObject({
      name: 'CliError',
      message: CONFLICTING_TEMPLATE_TYPE_ERROR,
      exitCode: 1,
    });

    expect(findFileMock).not.toHaveBeenCalled();
    expect(pathExistsMock).not.toHaveBeenCalled();
    expectNoWrites();
  });

  it('prompts interactively for one, several, or all component types', async () => {
    setStdinIsTTY(true);
    checkboxMock.mockResolvedValueOnce(['web-component', 'twig']);

    await componentEjectTemplates(undefined);

    expect(checkboxMock).toHaveBeenCalledTimes(1);
    const prompt = checkboxMock.mock.calls[0][0];
    expect(prompt).toMatchObject({
      message: 'Which component template types should be ejected?',
    });
    expect(prompt.choices.map(({ value }: { value: string }) => value)).toEqual(
      ['twig', 'twig-sdc', 'react', 'web-component'],
    );
    expect(prompt.validate([])).toBe('Select at least one component type.');
    expect(prompt.validate([{ value: 'twig' }])).toBe(true);

    const expectedCount =
      buildEjectableComponentTemplates('twig').length +
      buildEjectableComponentTemplates('web-component').length;
    expect(writeFileMock).toHaveBeenCalledTimes(expectedCount);
    expect(writeFileMock.mock.calls[0][0]).toBe(
      destination('twig', 'component.twig'),
    );
  });

  it.each([false, undefined])(
    'fails before project lookup or writes without [type] when stdin TTY is %s',
    async (stdinIsTTY) => {
      setStdinIsTTY(stdinIsTTY);

      await expect(componentEjectTemplates(undefined)).rejects.toMatchObject({
        name: 'CliError',
        message: MISSING_TEMPLATE_TYPE_ERROR,
        exitCode: 1,
      });

      expect(findFileMock).not.toHaveBeenCalled();
      expect(checkboxMock).not.toHaveBeenCalled();
      expect(pathExistsMock).not.toHaveBeenCalled();
      expectNoWrites();
    },
  );

  it('checks terminal interactivity again immediately before prompting', async () => {
    setStdinIsTTY(true);
    findFileMock.mockImplementationOnce(() => {
      setStdinIsTTY(false);
      return projectConfigPath;
    });

    await expect(componentEjectTemplates(undefined)).rejects.toThrow(
      MISSING_TEMPLATE_TYPE_ERROR,
    );

    expect(checkboxMock).not.toHaveBeenCalled();
    expect(pathExistsMock).not.toHaveBeenCalled();
    expectNoWrites();
  });

  it('fails clearly when there is no Emulsify project', async () => {
    findFileMock.mockReturnValueOnce(undefined);

    await expect(componentEjectTemplates('twig')).rejects.toMatchObject({
      name: 'CliError',
      message:
        'No Emulsify project detected. Run this command within an existing Emulsify project.',
      exitCode: 1,
    });

    expect(checkboxMock).not.toHaveBeenCalled();
    expect(pathExistsMock).not.toHaveBeenCalled();
    expectNoWrites();
  });

  it('rejects invalid and traversing explicit type values', async () => {
    await expect(componentEjectTemplates('../outside')).rejects.toMatchObject({
      name: 'CliError',
      message: expect.stringContaining('Invalid component type'),
    });

    expect(pathExistsMock).not.toHaveBeenCalled();
    expectNoWrites();
  });

  it('rejects an empty interactive selection defensively', async () => {
    setStdinIsTTY(true);
    checkboxMock.mockResolvedValueOnce([]);

    await expect(componentEjectTemplates(undefined)).rejects.toMatchObject({
      name: 'CliError',
      message: 'Select at least one component type.',
    });

    expect(pathExistsMock).not.toHaveBeenCalled();
    expectNoWrites();
  });

  it('preflights every conflict and refuses the whole selection without --force', async () => {
    const twigConflict = destination('twig', 'component.twig');
    const storiesConflict = destination('twig', 'component.stories.js');
    pathExistsMock.mockImplementation(
      async (target: string) =>
        target === twigConflict || target === storiesConflict,
    );

    const error = await componentEjectTemplates('twig').catch(
      (reason: unknown) => reason,
    );
    expect(error).toMatchObject({ name: 'CliError' });
    const message = (error as Error).message;
    expect(message).toContain(twigConflict);
    expect(message).toContain(storiesConflict);
    expect(message.indexOf(twigConflict)).toBeLessThan(
      message.indexOf(storiesConflict),
    );
    expect(message).toContain('Pass --force');

    expect(pathExistsMock).toHaveBeenCalledTimes(4);
    expectNoWrites();
    expect(logMock).not.toHaveBeenCalled();
  });

  it('replaces every selected known template with --force', async () => {
    pathExistsMock.mockResolvedValue(true);

    await componentEjectTemplates('react', { force: true });

    const artifacts = buildEjectableComponentTemplates('react');
    expect(writeFileMock).toHaveBeenCalledTimes(artifacts.length);
    for (const artifact of artifacts) {
      expect(writeFileMock).toHaveBeenCalledWith(
        destination('react', artifact.logicalName),
        artifact.contents,
        { encoding: 'utf-8', flag: 'w' },
      );
    }
  });

  it('does not overwrite a template created after the conflict preflight', async () => {
    writeFileMock.mockRejectedValueOnce(
      Object.assign(new Error('already exists'), { code: 'EEXIST' }),
    );

    await expect(componentEjectTemplates('twig')).rejects.toMatchObject({
      name: 'CliError',
      message: expect.stringMatching(/appeared.*not replaced.*--force/u),
    });

    expect(writeFileMock).toHaveBeenCalledWith(
      destination('twig', 'component.twig'),
      expect.any(String),
      { encoding: 'utf-8', flag: 'wx' },
    );
    expect(logMock).not.toHaveBeenCalled();
  });

  it('previews creates and conflicts without writing or failing', async () => {
    const conflict = destination('twig', 'component.scss');
    pathExistsMock.mockImplementation(
      async (target: string) => target === conflict,
    );

    await componentEjectTemplates('twig', { dryRun: true });

    expectNoWrites();
    expect(logMock).toHaveBeenCalledWith(
      'info',
      expect.stringMatching(
        /component\.twig \(would create\)[\s\S]*component\.scss \(conflict; a real run requires --force\)[\s\S]*No files were written or replaced\./,
      ),
    );
  });

  it('previews replacements when --force accompanies --dry-run', async () => {
    pathExistsMock.mockResolvedValue(true);

    await componentEjectTemplates('web-component', {
      dryRun: true,
      force: true,
    });

    expectNoWrites();
    expect(logMock).toHaveBeenCalledWith(
      'info',
      expect.stringContaining('(would replace)'),
    );
  });

  it.each([
    [new Error('disk full'), 'disk full'],
    ['write failed', 'write failed'],
  ])(
    'reports a write failure without claiming success',
    async (failure, text) => {
      writeFileMock.mockRejectedValueOnce(failure);

      await expect(componentEjectTemplates('react')).rejects.toMatchObject({
        name: 'CliError',
        message: `Unable to write component template "${destination('react', 'component.jsx')}": ${text}`,
      });

      expect(logMock).not.toHaveBeenCalled();
    },
  );
});
