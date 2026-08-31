jest.mock('@inquirer/prompts');
jest.mock('../lib/log', () => jest.fn());
jest.mock('../util/fs/findFileInCurrentPath', () => jest.fn());

import { checkbox } from '@inquirer/prompts';
import { constants as fsConstants, promises as fs } from 'fs';
import { basename, dirname, join, resolve } from 'path';
import { pathExists } from 'fs-extra';

import { EMULSIFY_PROJECT_CONFIG_FILE } from '../lib/constants.js';
import log from '../lib/log.js';
import expectToContainInOrder from '../testUtils/expectToContainInOrder.js';
import findFileInCurrentPath from '../util/fs/findFileInCurrentPath.js';
import type { ComponentType } from '../util/project/componentTypes.js';
import { buildEjectableComponentTemplates } from '../util/project/componentTemplates/index.js';
import componentEjectTemplates, {
  buildComponentTemplateEjectionPlan,
  CONFLICTING_TEMPLATE_TYPE_ERROR,
  MISSING_TEMPLATE_TYPE_ERROR,
} from './componentEjectTemplates.js';

const checkboxMock = checkbox as jest.Mock;
const copyFileMock = fs.copyFile as jest.Mock;
const findFileMock = findFileInCurrentPath as jest.Mock;
const logMock = log as jest.Mock;
const linkMock = fs.link as jest.Mock;
const mkdirMock = fs.mkdir as jest.Mock;
const openMock = fs.open as jest.Mock;
const pathExistsMock = pathExists as jest.Mock;
const renameMock = fs.rename as jest.Mock;
const rmMock = fs.rm as jest.Mock;
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

function transactionPathPrefix(
  target: string,
  kind: 'temporary' | 'backup',
): string {
  return join(dirname(target), `.${basename(target)}.emulsify-${kind}-`);
}

function expectNoWrites(): void {
  expect(copyFileMock).not.toHaveBeenCalled();
  expect(mkdirMock).not.toHaveBeenCalled();
  expect(openMock).not.toHaveBeenCalled();
  expect(writeFileMock).not.toHaveBeenCalled();
  expect(linkMock).not.toHaveBeenCalled();
  expect(renameMock).not.toHaveBeenCalled();
  expect(rmMock).not.toHaveBeenCalled();
}

function filesystemError(code: string, message = code): NodeJS.ErrnoException {
  return Object.assign(new Error(message), { code });
}

type InMemoryFileHandle = {
  target: string;
  close: jest.Mock;
};

function mockInMemoryFilesystem(
  initialFiles: Readonly<Record<string, string>> = {},
) {
  const files = new Map(Object.entries(initialFiles));
  const handles = new Map<string, InMemoryFileHandle>();

  const writeFile = async (
    target: string | InMemoryFileHandle,
    contents: string,
    options?: { flag?: string },
  ): Promise<void> => {
    const writeTarget = typeof target === 'string' ? target : target.target;
    if (options?.flag === 'wx' && files.has(writeTarget)) {
      throw filesystemError('EEXIST');
    }
    files.set(writeTarget, String(contents));
  };
  const open = async (
    target: string,
    flag: string,
  ): Promise<InMemoryFileHandle> => {
    if (flag === 'wx' && files.has(target)) throw filesystemError('EEXIST');

    files.set(target, '');
    const handle = {
      target,
      close: jest.fn().mockResolvedValue(undefined),
    };
    handles.set(target, handle);
    return handle;
  };
  const link = async (source: string, target: string): Promise<void> => {
    if (!files.has(source)) throw filesystemError('ENOENT');
    if (files.has(target)) throw filesystemError('EEXIST');
    files.set(target, files.get(source)!);
  };
  const copyFile = async (source: string, target: string): Promise<void> => {
    if (!files.has(source)) throw filesystemError('ENOENT');
    if (files.has(target)) throw filesystemError('EEXIST');
    files.set(target, files.get(source)!);
  };
  const rename = async (source: string, target: string): Promise<void> => {
    if (!files.has(source)) throw filesystemError('ENOENT');
    files.set(target, files.get(source)!);
    files.delete(source);
  };

  pathExistsMock.mockImplementation(async (target: string) =>
    files.has(target),
  );
  writeFileMock.mockImplementation(writeFile);
  openMock.mockImplementation(open);
  linkMock.mockImplementation(link);
  copyFileMock.mockImplementation(copyFile);
  renameMock.mockImplementation(rename);
  rmMock.mockImplementation(async (target: string) => {
    files.delete(target);
  });

  return { files, handles, open, rename, writeFile };
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
    copyFileMock.mockResolvedValue(undefined);
    findFileMock.mockReturnValue(projectConfigPath);
    pathExistsMock.mockResolvedValue(false);
    mkdirMock.mockResolvedValue(undefined);
    linkMock.mockResolvedValue(undefined);
    openMock.mockResolvedValue({
      close: jest.fn().mockResolvedValue(undefined),
    });
    renameMock.mockResolvedValue(undefined);
    rmMock.mockResolvedValue(undefined);
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
      expect(writeFileMock).toHaveBeenCalledWith(
        expect.stringContaining(transactionPathPrefix(target, 'temporary')),
        artifact.contents,
        {
          encoding: 'utf-8',
          flag: 'wx',
          flush: true,
        },
      );
      expect(linkMock).toHaveBeenCalledWith(
        expect.stringContaining(transactionPathPrefix(target, 'temporary')),
        target,
      );
      expect(rmMock).toHaveBeenCalledWith(
        expect.stringContaining(transactionPathPrefix(target, 'temporary')),
        { force: true },
      );
    }
    expect(Math.max(...writeFileMock.mock.invocationCallOrder)).toBeLessThan(
      Math.min(...linkMock.mock.invocationCallOrder),
    );

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

  it.each(['EPERM', 'ENOTSUP', 'EOPNOTSUPP'])(
    'publishes exclusive destination files when hard links fail with %s',
    async (code) => {
      const { files, handles } = mockInMemoryFilesystem();
      linkMock.mockRejectedValue(filesystemError(code, 'links unsupported'));

      await componentEjectTemplates('react');

      const artifacts = buildEjectableComponentTemplates('react');
      expect(Object.fromEntries(files)).toEqual(
        Object.fromEntries(
          artifacts.map(({ logicalName, contents }) => [
            destination('react', logicalName),
            contents,
          ]),
        ),
      );
      for (const artifact of artifacts) {
        const target = destination('react', artifact.logicalName);
        const handle = handles.get(target);
        expect(openMock).toHaveBeenCalledWith(target, 'wx');
        expect(writeFileMock).toHaveBeenCalledWith(handle, artifact.contents, {
          encoding: 'utf-8',
          flush: true,
        });
        expect(handle?.close).toHaveBeenCalledTimes(1);
      }
      expect(copyFileMock).not.toHaveBeenCalled();
      expect(renameMock).not.toHaveBeenCalled();
    },
  );

  it('surfaces non-link publish errors without using the fallback', async () => {
    const firstTarget = destination('react', 'component.jsx');
    const { files } = mockInMemoryFilesystem();
    const linkError = filesystemError('EACCES', 'link permission denied');
    linkMock.mockRejectedValueOnce(linkError);

    await expect(componentEjectTemplates('react')).rejects.toMatchObject({
      name: 'CliError',
      message: expect.stringContaining('link permission denied'),
    });

    expect(linkMock).toHaveBeenCalledTimes(1);
    expect(openMock).not.toHaveBeenCalled();
    expect(copyFileMock).not.toHaveBeenCalled();
    expect(renameMock).not.toHaveBeenCalled();
    expect(rmMock).not.toHaveBeenCalledWith(firstTarget, { force: true });
    expect(Object.fromEntries(files)).toEqual({});
  });

  it('writes all 15 templates without prompting when --all is passed', async () => {
    await componentEjectTemplates(undefined, { all: true });

    expect(checkboxMock).not.toHaveBeenCalled();
    expect(pathExistsMock).toHaveBeenCalledTimes(15);
    expect(mkdirMock).toHaveBeenCalledTimes(15);
    expect(writeFileMock).toHaveBeenCalledTimes(15);
    expect(writeFileMock).toHaveBeenCalledWith(
      expect.stringContaining(
        transactionPathPrefix(
          destination('twig', 'component.twig'),
          'temporary',
        ),
      ),
      expect.any(String),
      { encoding: 'utf-8', flag: 'wx', flush: true },
    );
    expect(writeFileMock).toHaveBeenCalledWith(
      expect.stringContaining(
        transactionPathPrefix(
          destination('web-component', 'component.stories.js'),
          'temporary',
        ),
      ),
      expect.any(String),
      { encoding: 'utf-8', flag: 'wx', flush: true },
    );
    expect(linkMock).toHaveBeenCalledTimes(15);
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
    expect(writeFileMock.mock.calls[0][0]).toContain(
      transactionPathPrefix(destination('twig', 'component.twig'), 'temporary'),
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
    expectToContainInOrder(message, [
      twigConflict,
      storiesConflict,
      'Pass --force',
    ]);

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
      const target = destination('react', artifact.logicalName);
      expect(writeFileMock).toHaveBeenCalledWith(
        expect.stringContaining(transactionPathPrefix(target, 'temporary')),
        artifact.contents,
        { encoding: 'utf-8', flag: 'wx', flush: true },
      );
      expect(linkMock).toHaveBeenCalledWith(
        target,
        expect.stringContaining(transactionPathPrefix(target, 'backup')),
      );
      expect(renameMock).toHaveBeenCalledWith(
        expect.stringContaining(transactionPathPrefix(target, 'temporary')),
        target,
      );
      expect(rmMock).toHaveBeenCalledWith(
        expect.stringContaining(transactionPathPrefix(target, 'backup')),
        { force: true },
      );
    }
  });

  it.each(['EPERM', 'ENOTSUP', 'EOPNOTSUPP'])(
    'copies restore points before replacement when hard links fail with %s',
    async (code) => {
      const artifacts = buildEjectableComponentTemplates('react');
      const initialFiles = Object.fromEntries(
        artifacts.map(({ logicalName }) => [
          destination('react', logicalName),
          `custom ${logicalName}`,
        ]),
      );
      const { files } = mockInMemoryFilesystem(initialFiles);
      linkMock.mockRejectedValue(filesystemError(code, 'links unsupported'));

      await componentEjectTemplates('react', { force: true });

      expect(Object.fromEntries(files)).toEqual(
        Object.fromEntries(
          artifacts.map(({ logicalName, contents }) => [
            destination('react', logicalName),
            contents,
          ]),
        ),
      );
      for (const artifact of artifacts) {
        const target = destination('react', artifact.logicalName);
        expect(copyFileMock).toHaveBeenCalledWith(
          target,
          expect.stringContaining(transactionPathPrefix(target, 'backup')),
          fsConstants.COPYFILE_EXCL,
        );
      }
    },
  );

  it('keeps originals intact when fallback backup copying fails', async () => {
    const artifacts = buildEjectableComponentTemplates('react');
    const firstTarget = destination('react', 'component.jsx');
    const initialFiles = Object.fromEntries(
      artifacts.map(({ logicalName }) => [
        destination('react', logicalName),
        `original ${logicalName}`,
      ]),
    );
    const { files } = mockInMemoryFilesystem(initialFiles);
    linkMock.mockRejectedValue(filesystemError('ENOTSUP'));
    let partialBackup: string | undefined;
    copyFileMock.mockImplementationOnce(
      async (_source: string, target: string) => {
        partialBackup = target;
        files.set(target, 'partial backup');
        throw filesystemError('EIO', 'backup copy failed');
      },
    );

    await expect(
      componentEjectTemplates('react', { force: true }),
    ).rejects.toMatchObject({
      name: 'CliError',
      message: expect.stringContaining('backup copy failed'),
    });

    expect(copyFileMock).toHaveBeenCalledTimes(1);
    expect(copyFileMock).toHaveBeenCalledWith(
      firstTarget,
      expect.stringContaining(transactionPathPrefix(firstTarget, 'backup')),
      fsConstants.COPYFILE_EXCL,
    );
    expect(renameMock).not.toHaveBeenCalled();
    expect(rmMock).toHaveBeenCalledWith(partialBackup, { force: true });
    expect(rmMock).not.toHaveBeenCalledWith(firstTarget, { force: true });
    expect(Object.fromEntries(files)).toEqual(initialFiles);
  });

  it('installs new files with --force when fallback backup copying finds no source', async () => {
    const { files } = mockInMemoryFilesystem();
    linkMock.mockRejectedValue(filesystemError('ENOTSUP'));

    await componentEjectTemplates('react', { force: true });

    const artifacts = buildEjectableComponentTemplates('react');
    expect(Object.fromEntries(files)).toEqual(
      Object.fromEntries(
        artifacts.map(({ logicalName, contents }) => [
          destination('react', logicalName),
          contents,
        ]),
      ),
    );
    expect(copyFileMock).toHaveBeenCalledTimes(artifacts.length);
  });

  it('rolls back successful and partial exclusive writes after publication fails', async () => {
    const firstTarget = destination('react', 'component.jsx');
    const failedTarget = destination('react', 'component.scss');
    const { files, handles, writeFile } = mockInMemoryFilesystem();
    linkMock.mockRejectedValue(filesystemError('EPERM'));
    writeFileMock.mockImplementation(
      async (
        target: string | InMemoryFileHandle,
        contents: string,
        options?: { flag?: string },
      ) => {
        await writeFile(target, contents, options);
        if (typeof target !== 'string' && target.target === failedTarget) {
          throw new Error('write interrupted');
        }
      },
    );

    await expect(componentEjectTemplates('react')).rejects.toMatchObject({
      name: 'CliError',
      message: expect.stringMatching(
        /write interrupted[\s\S]*All destination changes were rolled back\./u,
      ),
    });

    expect(Object.fromEntries(files)).toEqual({});
    expect(rmMock).toHaveBeenCalledWith(firstTarget, { force: true });
    expect(rmMock).toHaveBeenCalledWith(failedTarget, { force: true });
    expect(handles.get(failedTarget)?.close).toHaveBeenCalledTimes(1);
  });

  it('preserves a destination that appears before the exclusive-write fallback', async () => {
    const firstTarget = destination('react', 'component.jsx');
    const { files, open } = mockInMemoryFilesystem();
    linkMock.mockRejectedValue(filesystemError('EPERM'));
    openMock.mockImplementation(async (target: string, flag: string) => {
      if (target === firstTarget) files.set(target, 'concurrent contents');
      return open(target, flag);
    });

    await expect(componentEjectTemplates('react')).rejects.toMatchObject({
      name: 'CliError',
      message: expect.stringMatching(/appeared.*not replaced.*--force/u),
    });

    expect(Object.fromEntries(files)).toEqual({
      [firstTarget]: 'concurrent contents',
    });
    expect(rmMock).not.toHaveBeenCalledWith(firstTarget, { force: true });
  });

  it('preserves a pre-existing destination when fallback exclusive open fails', async () => {
    const firstTarget = destination('react', 'component.jsx');
    const userContents = 'user contents';
    const { files } = mockInMemoryFilesystem();
    linkMock.mockRejectedValue(filesystemError('EPERM', 'link unavailable'));
    openMock.mockImplementationOnce(async (target: string) => {
      files.set(target, userContents);
      throw filesystemError('EACCES', 'exclusive open denied');
    });

    await expect(componentEjectTemplates('react')).rejects.toMatchObject({
      name: 'CliError',
      message: expect.stringMatching(
        /component\.jsx[\s\S]*exclusive open denied[\s\S]*All destination changes were rolled back\./u,
      ),
    });

    expect(openMock).toHaveBeenCalledTimes(1);
    expect(openMock).toHaveBeenCalledWith(firstTarget, 'wx');
    expect(rmMock).not.toHaveBeenCalledWith(firstTarget, { force: true });
    expect(Object.fromEntries(files)).toEqual({
      [firstTarget]: userContents,
    });
  });

  it('does not overwrite a template created after the conflict preflight', async () => {
    linkMock.mockRejectedValueOnce(
      Object.assign(new Error('already exists'), { code: 'EEXIST' }),
    );

    await expect(componentEjectTemplates('twig')).rejects.toMatchObject({
      name: 'CliError',
      message: expect.stringMatching(/appeared.*not replaced.*--force/u),
    });

    expect(linkMock).toHaveBeenCalledWith(
      expect.stringContaining(
        transactionPathPrefix(
          destination('twig', 'component.twig'),
          'temporary',
        ),
      ),
      destination('twig', 'component.twig'),
    );
    expect(logMock).not.toHaveBeenCalled();
  });

  it('changes no destinations when staging fails after earlier templates were staged', async () => {
    writeFileMock
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('disk full'));

    await expect(componentEjectTemplates('react')).rejects.toMatchObject({
      name: 'CliError',
      message: expect.stringMatching(
        /Unable to stage.*component\.scss.*disk full.*No destination files were changed\./u,
      ),
    });

    expect(writeFileMock).toHaveBeenCalledTimes(2);
    expect(linkMock).not.toHaveBeenCalled();
    expect(renameMock).not.toHaveBeenCalled();
    expect(rmMock).toHaveBeenCalledWith(writeFileMock.mock.calls[0][0], {
      force: true,
    });
    expect(
      rmMock.mock.calls.every(([target]) =>
        String(target).includes('.emulsify-temporary-'),
      ),
    ).toBe(true);
    expect(logMock).not.toHaveBeenCalled();
  });

  it('reports transaction files that cannot be cleaned up after installation', async () => {
    rmMock.mockRejectedValueOnce(new Error('cleanup denied'));

    const error = await componentEjectTemplates('twig').catch(
      (reason: unknown) => reason,
    );

    const failedCleanupPath = writeFileMock.mock.calls[0][0];
    expect(error).toMatchObject({ name: 'CliError' });
    expect((error as Error).message).toContain(
      'Component templates were installed, but transaction cleanup was incomplete:',
    );
    expect((error as Error).message).toContain(
      `  - ${failedCleanupPath}: cleanup denied`,
    );
    expect(linkMock).toHaveBeenCalledTimes(
      buildEjectableComponentTemplates('twig').length,
    );
    expect(logMock).not.toHaveBeenCalled();
  });

  it('reports rollback and transaction cleanup removal failures together', async () => {
    const installedTarget = destination('react', 'component.jsx');
    linkMock
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('publish failed'));
    rmMock.mockImplementation(async (target: string) => {
      if (target === installedTarget) {
        throw new Error('rollback denied');
      }
      if (target.includes('.emulsify-temporary-')) {
        throw new Error('cleanup denied');
      }
    });

    const error = await componentEjectTemplates('react').catch(
      (reason: unknown) => reason,
    );

    expect(error).toMatchObject({ name: 'CliError' });
    expect((error as Error).message).toContain(
      `Unable to install component template "${destination('react', 'component.scss')}": publish failed.`,
    );
    expect((error as Error).message).toContain('Rollback was incomplete:');
    expect((error as Error).message).toContain(
      `Could not remove newly installed "${installedTarget}": rollback denied`,
    );
    expect((error as Error).message).toContain(
      'Temporary transaction files could not be removed:',
    );
    expect((error as Error).message).toContain('cleanup denied');
    expect(logMock).not.toHaveBeenCalled();
  });

  it('restores replaced files and removes new files after a mid-finalization failure', async () => {
    const replacedTarget = destination('react', 'component.jsx');
    const newTarget = destination('react', 'component.scss');
    const failedTarget = destination('react', 'component.stories.jsx');
    linkMock.mockImplementation(async (source: string) => {
      if (source === replacedTarget) return undefined;
      throw Object.assign(new Error('missing'), { code: 'ENOENT' });
    });
    renameMock
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('rename failed'))
      .mockResolvedValue(undefined);

    await expect(
      componentEjectTemplates('react', { force: true }),
    ).rejects.toMatchObject({
      name: 'CliError',
      message: expect.stringMatching(
        /Unable to install[\s\S]*component\.stories\.jsx[\s\S]*rename failed[\s\S]*All destination changes were rolled back\./u,
      ),
    });

    const replacedBackup = linkMock.mock.calls.find(
      ([source]) => source === replacedTarget,
    )?.[1];
    expect(replacedBackup).toContain(
      transactionPathPrefix(replacedTarget, 'backup'),
    );
    expect(renameMock).toHaveBeenCalledWith(replacedBackup, replacedTarget);
    expect(rmMock).toHaveBeenCalledWith(newTarget, { force: true });
    expect(renameMock).toHaveBeenCalledWith(
      expect.stringContaining(transactionPathPrefix(failedTarget, 'temporary')),
      failedTarget,
    );
    expect(logMock).not.toHaveBeenCalled();
  });

  it('restores copied backups after a mid-transaction fallback failure', async () => {
    const artifacts = buildEjectableComponentTemplates('react');
    const initialFiles = Object.fromEntries(
      artifacts.map(({ logicalName }) => [
        destination('react', logicalName),
        `original ${logicalName}`,
      ]),
    );
    const { files, rename } = mockInMemoryFilesystem(initialFiles);
    linkMock.mockRejectedValue(filesystemError('ENOTSUP'));
    let installCount = 0;
    renameMock.mockImplementation(async (source: string, target: string) => {
      if (source.includes('.emulsify-temporary-')) {
        installCount += 1;
        if (installCount === 2) throw new Error('install failed');
      }
      await rename(source, target);
    });

    await expect(
      componentEjectTemplates('react', { force: true }),
    ).rejects.toMatchObject({
      name: 'CliError',
      message: expect.stringMatching(
        /install failed[\s\S]*All destination changes were rolled back\./u,
      ),
    });

    expect(Object.fromEntries(files)).toEqual(initialFiles);
    expect(copyFileMock).toHaveBeenCalledTimes(2);
    for (const [target, backup] of copyFileMock.mock.calls) {
      expect(renameMock).toHaveBeenCalledWith(backup, target);
    }
  });

  it('preserves and reports a backup when rollback cannot restore it', async () => {
    const firstTarget = destination('react', 'component.jsx');
    const failedTarget = destination('react', 'component.scss');
    linkMock.mockResolvedValue(undefined);
    renameMock
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('install failed'))
      .mockRejectedValueOnce(new Error('restore failed'))
      .mockResolvedValue(undefined);

    const error = await componentEjectTemplates('react', {
      force: true,
    }).catch((reason: unknown) => reason);

    const failedBackup = linkMock.mock.calls.find(
      ([source]) => source === failedTarget,
    )?.[1];
    expect(error).toMatchObject({ name: 'CliError' });
    expect((error as Error).message).toContain('Rollback was incomplete:');
    expect((error as Error).message).toContain(
      `Could not restore "${failedTarget}"; its previous contents remain at "${failedBackup}": restore failed`,
    );
    expect(renameMock).toHaveBeenCalledWith(
      linkMock.mock.calls.find(([source]) => source === firstTarget)?.[1],
      firstTarget,
    );
    expect(rmMock).not.toHaveBeenCalledWith(failedBackup, { force: true });
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
        message: expect.stringContaining(
          `Unable to stage component template "${destination('react', 'component.jsx')}": ${text}. No destination files were changed.`,
        ),
      });

      expect(linkMock).not.toHaveBeenCalled();
      expect(renameMock).not.toHaveBeenCalled();
      expect(logMock).not.toHaveBeenCalled();
    },
  );
});
