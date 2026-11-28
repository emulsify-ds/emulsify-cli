jest.mock('../../lib/log', () => jest.fn());
jest.mock('../../lib/session', () => ({
  note: jest.fn(),
  onAbort: jest.fn(),
  spinner: jest.fn(),
}));
jest.mock('./componentNpmManifest', () => ({
  detectComponentPackageManager: jest.fn(),
  readComponentNpmManifest: jest.fn(),
  writeComponentNpmManifest: jest.fn(),
}));
jest.mock('./installDependencies', () => jest.fn());

import { confirm } from '@clack/prompts';
import { join, resolve } from 'path';
import CliError from '../../lib/CliError.js';
import log from '../../lib/log.js';
import { note, onAbort, spinner } from '../../lib/session.js';
import {
  detectComponentPackageManager,
  readComponentNpmManifest,
  writeComponentNpmManifest,
} from './componentNpmManifest.js';
import {
  applyComponentNpmInstall,
  confirmComponentNpmInstall,
  formatComponentNpmInstall,
  prepareComponentNpmInstall,
} from './installComponentNpmDependencies.js';
import installDependencies from './installDependencies.js';

const root = resolve('/project');
const projectPath = join(root, 'project.emulsify.json');
const manifest = {
  status: 'ready',
  path: join(root, 'package.json'),
  source: '{"name":"example"}',
  json: { name: 'example' },
} as const;
const components = [
  { name: 'slider', structure: 'base', npmDependencies: { swiper: '^11.2.0' } },
];
const dispose = jest.fn();
const progress = {
  start: jest.fn(),
  stop: jest.fn(),
  cancel: jest.fn(),
  error: jest.fn(),
  message: jest.fn(),
  clear: jest.fn(),
  isCancelled: false,
};

const prepare = (reportOnly = false) =>
  prepareComponentNpmInstall('Compound', components, projectPath, reportOnly);

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(detectComponentPackageManager).mockReturnValue('npm');
  jest.mocked(readComponentNpmManifest).mockResolvedValue(manifest);
  jest.mocked(writeComponentNpmManifest).mockResolvedValue(undefined);
  jest.mocked(installDependencies).mockResolvedValue('');
  jest.mocked(onAbort).mockReturnValue(dispose);
  jest.mocked(spinner).mockReturnValue(progress);
});

it('prepares an npm plan and applies it to the project root', async () => {
  const plan = await prepare();

  expect(readComponentNpmManifest).toHaveBeenCalledWith(root);
  expect(plan?.packages).toEqual([
    {
      name: 'swiper',
      range: '^11.2.0',
      components: ['slider'],
      status: 'missing',
    },
  ]);
  expect(writeComponentNpmManifest).not.toHaveBeenCalled();
  expect(installDependencies).not.toHaveBeenCalled();

  await expect(applyComponentNpmInstall(plan, true)).resolves.toBe(1);

  expect(writeComponentNpmManifest).toHaveBeenCalledWith(
    manifest,
    new Map([['swiper', '^11.2.0']]),
  );
  expect(installDependencies).toHaveBeenCalledWith(root, {
    ignoreScripts: true,
  });
  expect(
    jest.mocked(writeComponentNpmManifest).mock.invocationCallOrder[0],
  ).toBeLessThan(jest.mocked(installDependencies).mock.invocationCallOrder[0]);
  expect(progress.stop).toHaveBeenCalledWith(
    'Installed 1 npm package with npm',
  );
  expect(dispose).toHaveBeenCalledTimes(1);
});

it('reports skipped packages without prompting or writing', async () => {
  const plan = await prepare(true);
  const accepted = await confirmComponentNpmInstall(
    plan,
    true,
    false,
    'slider',
  );

  expect(accepted).toBe(false);
  await expect(applyComponentNpmInstall(plan, accepted)).resolves.toBe(0);

  expect(confirm).not.toHaveBeenCalled();
  expect(note).toHaveBeenCalledWith(
    expect.stringContaining('npm install "swiper@^11.2.0"'),
    'npm packages',
  );
  expect(writeComponentNpmManifest).not.toHaveBeenCalled();
  expect(installDependencies).not.toHaveBeenCalled();
});

it('requires a manifest for installation and reports the problem in previews', async () => {
  jest.mocked(readComponentNpmManifest).mockResolvedValue({
    status: 'missing',
    path: manifest.path,
    reason: 'does not exist',
  });

  await expect(prepare()).rejects.toThrow(CliError);
  const plan = await prepare(true);

  expect(formatComponentNpmInstall(plan, 'preview')).toContain('npm init -y');
  await expect(applyComponentNpmInstall(plan, true)).resolves.toBe(0);
  expect(writeComponentNpmManifest).not.toHaveBeenCalled();
  expect(installDependencies).not.toHaveBeenCalled();
});

it('requires a project path before reading the package manifest', async () => {
  await expect(
    prepareComponentNpmInstall('Compound', components, undefined, false),
  ).rejects.toThrow('Unable to locate the Emulsify project for npm packages.');

  expect(readComponentNpmManifest).not.toHaveBeenCalled();
});

it.each([
  ['pnpm', `From ${root}, run: pnpm install`],
  [
    'unsupported',
    'Use the package manager declared in package.json to install these packages.',
  ],
] as const)(
  'updates the manifest and gives manual instructions for %s',
  async (manager, instructions) => {
    jest.mocked(detectComponentPackageManager).mockReturnValue(manager);
    const plan = await prepare();

    await expect(applyComponentNpmInstall(plan, true)).resolves.toBe(1);

    expect(writeComponentNpmManifest).toHaveBeenCalledWith(
      manifest,
      new Map([['swiper', '^11.2.0']]),
    );
    expect(log).toHaveBeenCalledWith('info', instructions);
    expect(spinner).not.toHaveBeenCalled();
    expect(installDependencies).not.toHaveBeenCalled();
  },
);

it('warns about invalid declarations in report-only plans and keeps valid entries', async () => {
  const plan = await prepareComponentNpmInstall(
    'Compound',
    [
      {
        name: 'slider',
        structure: 'base',
        npmDependencies: { swiper: '^11.2.0', '../escape': '^1.0.0' },
      },
    ],
    projectPath,
    true,
  );

  expect(log).toHaveBeenCalledWith(
    'warn',
    expect.stringContaining('"../escape" has an invalid npm package name.'),
  );
  expect(plan?.packages.map(({ name }) => name)).toEqual(['swiper']);
});
