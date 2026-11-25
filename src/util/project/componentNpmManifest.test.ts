jest.mock('fs', () => ({
  existsSync: jest.fn(),
  promises: {
    readFile: jest.fn(),
    stat: jest.fn(),
    writeFile: jest.fn(),
    chmod: jest.fn(),
    rename: jest.fn(),
    rm: jest.fn(),
  },
}));

import { existsSync, promises as fs, type Stats } from 'fs';
import { basename, dirname, join, resolve } from 'path';
import CliError from '../../lib/CliError.js';
import {
  detectComponentPackageManager,
  readComponentNpmManifest,
  writeComponentNpmManifest,
} from './componentNpmManifest.js';

const projectRoot = resolve('/project');
const packagePath = join(projectRoot, 'package.json');
const existsMock = jest.mocked(existsSync);
const readMock = jest.mocked(fs.readFile);
const statMock = jest.mocked(fs.stat);
const writeMock = jest.mocked(fs.writeFile);
const chmodMock = jest.mocked(fs.chmod);
const renameMock = jest.mocked(fs.rename);
const rmMock = jest.mocked(fs.rm);

beforeEach(() => {
  jest.resetAllMocks();
  statMock.mockResolvedValue({ mode: 0o100664 } as Stats);
});

async function readReadyManifest(source: string) {
  readMock.mockResolvedValue(source);
  const manifest = await readComponentNpmManifest(projectRoot);
  if (manifest.status !== 'ready') {
    throw new Error(`Expected valid package.json, got ${manifest.status}`);
  }
  return manifest;
}

describe('readComponentNpmManifest', () => {
  it('reads the project root manifest and preserves its source', async () => {
    const source = '{ "name": "example", "private": true }\n';
    readMock.mockResolvedValueOnce(source);

    await expect(readComponentNpmManifest(projectRoot)).resolves.toEqual({
      status: 'ready',
      path: packagePath,
      source,
      json: { name: 'example', private: true },
    });
    expect(readMock).toHaveBeenCalledWith(packagePath, 'utf8');
  });

  it.each([
    ['ENOENT', 'missing', 'does not exist'],
    ['EACCES', 'unreadable', 'could not be read'],
  ])('reports %s as %s', async (code, status, reason) => {
    readMock.mockRejectedValueOnce(Object.assign(new Error(code), { code }));

    await expect(readComponentNpmManifest(projectRoot)).resolves.toEqual({
      status,
      path: packagePath,
      reason,
    });
  });

  it.each([
    ['{ invalid', 'does not contain valid JSON'],
    ['null', 'does not contain a JSON object'],
    ['[]', 'does not contain a JSON object'],
    ['{"dependencies":null}', 'has a dependencies field that is not an object'],
  ])(
    'reports invalid manifests without changing them',
    async (source, reason) => {
      readMock.mockResolvedValueOnce(source);

      await expect(readComponentNpmManifest(projectRoot)).resolves.toEqual({
        status: 'invalid',
        path: packagePath,
        reason,
      });
      expect(writeMock).not.toHaveBeenCalled();
    },
  );
});

describe('detectComponentPackageManager', () => {
  it.each([
    ['npm@11.0.0', 'npm'],
    ['pnpm@9.15.0', 'pnpm'],
    ['yarn@4.0.0', 'yarn'],
    ['bun@1.2.0', 'bun'],
    ['example@1.0.0', 'unsupported'],
  ])(
    'uses packageManager %s before looking for lockfiles',
    (field, manager) => {
      expect(detectComponentPackageManager(projectRoot, field)).toBe(manager);
      expect(existsMock).not.toHaveBeenCalled();
    },
  );

  it.each([
    ['package-lock.json', 'npm'],
    ['npm-shrinkwrap.json', 'npm'],
    ['pnpm-lock.yaml', 'pnpm'],
    ['yarn.lock', 'yarn'],
    ['bun.lock', 'bun'],
    ['bun.lockb', 'bun'],
  ])('detects %s in the root', (lockfile, manager) => {
    existsMock.mockImplementation(
      (file) => file === join(projectRoot, lockfile),
    );
    expect(detectComponentPackageManager(projectRoot)).toBe(manager);
  });

  it('defaults to npm without a packageManager or lockfile', () => {
    expect(detectComponentPackageManager(projectRoot)).toBe('npm');
  });

  it('uses the first matching lockfile in the prescribed order', () => {
    existsMock.mockReturnValue(true);
    expect(detectComponentPackageManager(projectRoot)).toBe('npm');
    expect(existsMock).toHaveBeenCalledTimes(1);
    expect(existsMock).toHaveBeenCalledWith(
      join(projectRoot, 'package-lock.json'),
    );
  });
});

describe('writeComponentNpmManifest', () => {
  it.each([
    ['two spaces', '  ', '\n', '\n'],
    ['four spaces', '    ', '\n', '\n'],
    ['tabs', '\t', '\n', '\n'],
    ['CRLF', '  ', '\r\n', '\r\n'],
    ['no trailing newline', '  ', '\n', ''],
  ])(
    'preserves %s while sorting dependencies',
    async (_, indent, newline, ending) => {
      const json = {
        name: 'example',
        config: { dependencies: { unrelated: 'a string with a } and a "' } },
        dependencies: { zebra: '^1.0.0', banana: '1.x' },
        private: true,
      };
      const format = (data: unknown) =>
        JSON.stringify(data, null, indent).replaceAll('\n', newline) + ending;
      const manifest = await readReadyManifest(format(json));

      await writeComponentNpmManifest(
        manifest,
        new Map([
          ['swiper', '^11.2.0'],
          ['apple', '~1.0'],
        ]),
      );

      const [temporaryPath] = writeMock.mock.calls[0];
      expect(dirname(String(temporaryPath))).toBe(projectRoot);
      expect(basename(String(temporaryPath))).toMatch(
        /^\.package\.json\..+\.tmp$/,
      );
      expect(writeMock).toHaveBeenCalledWith(
        temporaryPath,
        format({
          ...json,
          dependencies: {
            apple: '~1.0',
            banana: '1.x',
            swiper: '^11.2.0',
            zebra: '^1.0.0',
          },
        }),
        { encoding: 'utf8', flag: 'wx', flush: true, mode: 0o664 },
      );
      expect(chmodMock).toHaveBeenCalledWith(temporaryPath, 0o664);
      expect(renameMock).toHaveBeenCalledWith(temporaryPath, packagePath);
      expect(writeMock.mock.invocationCallOrder[0]).toBeLessThan(
        chmodMock.mock.invocationCallOrder[0],
      );
      expect(chmodMock.mock.invocationCallOrder[0]).toBeLessThan(
        renameMock.mock.invocationCallOrder[0],
      );
      expect(rmMock).not.toHaveBeenCalled();
    },
  );

  it('appends a dependencies object after the other top-level keys', async () => {
    const manifest = await readReadyManifest(
      '    {\n  "name": "example",\n  "private": true\n}\n',
    );
    await writeComponentNpmManifest(manifest, new Map([['swiper', '^11.2.0']]));

    expect(writeMock.mock.calls[0][1]).toBe(
      '    {\n  "name": "example",\n  "private": true,\n  "dependencies": {\n    "swiper": "^11.2.0"\n  }\n}\n',
    );
  });

  it('retains compact JSON and sorts number-like package names alphabetically', async () => {
    const manifest = await readReadyManifest(
      String.raw`{"9":true,"1":false,"\u0064ependencies":{"2":"1","__proto__":"1"}}`,
    );
    await writeComponentNpmManifest(
      manifest,
      new Map([
        ['10', '1'],
        ['constructor', '1'],
      ]),
    );

    expect(writeMock.mock.calls[0][1]).toBe(
      String.raw`{"9":true,"1":false,"\u0064ependencies":{"10":"1","2":"1","__proto__":"1","constructor":"1"}}`,
    );
  });

  it('handles an empty manifest without inserting a comma', async () => {
    const manifest = await readReadyManifest('{}');
    await writeComponentNpmManifest(manifest, new Map([['swiper', '^11.2.0']]));

    expect(writeMock.mock.calls[0][1]).toBe(
      '{"dependencies":{"swiper":"^11.2.0"}}',
    );
  });

  it('writes nothing when no package is missing', async () => {
    const manifest = await readReadyManifest(
      '{"dependencies":{"swiper":"^11.0.0"}}',
    );
    await writeComponentNpmManifest(manifest, new Map());
    await writeComponentNpmManifest(manifest, new Map([['swiper', '^11.2.0']]));

    expect(writeMock).not.toHaveBeenCalled();
    expect(statMock).not.toHaveBeenCalled();
    expect(renameMock).not.toHaveBeenCalled();
  });

  it('does not overwrite a manifest that changed after reading it', async () => {
    const manifest = await readReadyManifest('{}');
    readMock.mockResolvedValueOnce('{"name":"changed"}');

    await expect(
      writeComponentNpmManifest(manifest, new Map([['swiper', '^11.2.0']])),
    ).rejects.toThrow('changed during installation');

    expect(renameMock).not.toHaveBeenCalled();
    expect(rmMock).toHaveBeenCalledWith(writeMock.mock.calls[0][0], {
      force: true,
    });
  });

  it('reports rename and cleanup failures as a CliError', async () => {
    const manifest = await readReadyManifest('{}');
    renameMock.mockRejectedValueOnce(new Error('rename failed'));
    rmMock.mockRejectedValueOnce(new Error('cleanup failed'));

    const result = writeComponentNpmManifest(
      manifest,
      new Map([['swiper', '^11.2.0']]),
    );
    await expect(result).rejects.toBeInstanceOf(CliError);
    await expect(result).rejects.toThrow(/rename failed.*cleanup failed/);
  });
});
