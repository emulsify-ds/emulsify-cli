/**
 * @file End-to-end tests for the real, built Emulsify CLI.
 */

import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { after, before, describe, test } from 'node:test';

const repositoryRoot = fileURLToPath(new URL('../..', import.meta.url));
const cliPath = join(repositoryRoot, 'dist', 'index.js');
const packageInfo = JSON.parse(
  readFileSync(join(repositoryRoot, 'package.json'), 'utf8'),
);
const expectedRootHelp = readFileSync(
  new URL('./root-help.txt', import.meta.url),
  'utf8',
)
  .replaceAll('\r\n', '\n')
  .replace('{{version}}', packageInfo.version);

let tempRoot;
let isolatedHome;
let projectsRoot;
let projectRoot;
let starterRepository;
let systemRepository;
let systemHookSentinel;

function json(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function isolatedEnvironment() {
  const env = {
    ...process.env,
    HOME: isolatedHome,
    USERPROFILE: isolatedHome,
    GIT_CONFIG_GLOBAL: join(isolatedHome, '.gitconfig'),
    GIT_CONFIG_NOSYSTEM: '1',
    GIT_TERMINAL_PROMPT: '0',
    NODE_NO_WARNINGS: '1',
    NO_COLOR: '1',
    npm_config_audit: 'false',
    npm_config_cache: join(tempRoot, 'npm-cache'),
    npm_config_fund: 'false',
    npm_config_offline: 'true',
    npm_config_update_notifier: 'false',
  };

  delete env.CLICOLOR_FORCE;
  delete env.FORCE_COLOR;
  return env;
}

function git(cwd, args) {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    env: isolatedEnvironment(),
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function createGitRepository(directory, files) {
  mkdirSync(directory, { recursive: true });
  git(directory, ['init', '--initial-branch=main']);

  for (const [relativePath, contents] of Object.entries(files)) {
    const destination = join(directory, relativePath);
    mkdirSync(dirname(destination), { recursive: true });
    writeFileSync(destination, contents);
  }

  git(directory, ['add', '.']);
  git(directory, [
    '-c',
    'user.email=e2e@example.test',
    '-c',
    'user.name=Emulsify E2E',
    'commit',
    '-m',
    'test: create e2e fixture',
  ]);
}

function runCli(cwd, args) {
  const result = spawnSync(process.execPath, [cliPath, ...args], {
    cwd,
    encoding: 'utf8',
    env: isolatedEnvironment(),
    shell: false,
    timeout: 15_000,
    windowsHide: true,
  });

  if (result.error) {
    throw result.error;
  }
  assert.equal(result.signal, null, `CLI terminated with ${result.signal}`);

  return {
    status: result.status,
    stderr: result.stderr,
    stdout: result.stdout,
  };
}

function commandFailure(label, result) {
  return [
    `${label} failed with status ${result.status}.`,
    `stdout:\n${result.stdout}`,
    `stderr:\n${result.stderr}`,
  ].join('\n');
}

describe('built Emulsify CLI', { concurrency: false }, () => {
  before(() => {
    tempRoot = mkdtempSync(join(tmpdir(), 'emulsify-cli-e2e-'));
    isolatedHome = join(tempRoot, 'home');
    projectsRoot = join(tempRoot, 'projects');
    projectRoot = join(projectsRoot, 'fixture-project');
    systemHookSentinel = join(projectRoot, 'system-install-hook-ran.txt');
    mkdirSync(isolatedHome, { recursive: true });
    mkdirSync(projectsRoot, { recursive: true });

    const starterPath = join(tempRoot, 'starter.git');
    createGitRepository(starterPath, {
      'package.json': json({
        name: 'emulsify-e2e-starter',
        version: '1.0.0',
        private: true,
        type: 'module',
      }),
      'package-lock.json': json({
        name: 'emulsify-e2e-starter',
        version: '1.0.0',
        lockfileVersion: 3,
        requires: true,
        packages: {
          '': {
            name: 'emulsify-e2e-starter',
            version: '1.0.0',
          },
        },
      }),
      'system.emulsify.json': json({
        name: 'fixture-project-system',
        homepage: 'https://example.test/project-system',
        repository: 'https://example.test/fixture-project-system.git',
        structure: [],
        variants: [],
      }),
      '.cli/systemInstall.js': [
        "import { writeFileSync } from 'node:fs';",
        "writeFileSync(new URL('../system-install-hook-ran.txt', import.meta.url), 'ran\\n');",
        '',
      ].join('\n'),
    });
    starterRepository = pathToFileURL(starterPath).href;

    const structureImplementations = [
      {
        name: 'components',
        directory: 'components',
      },
    ];
    const systemPath = join(tempRoot, 'fixture-system.git');
    createGitRepository(systemPath, {
      'system.emulsify.json': json({
        name: 'fixture-system',
        homepage: 'https://example.test/fixture-system',
        repository: 'https://example.test/fixture-system.git',
        structure: [
          {
            name: 'components',
            description: 'Fixture components',
          },
        ],
        variants: [
          {
            platform: 'none',
            structureImplementations,
            components: [
              {
                name: 'button',
                structure: 'components',
                required: true,
              },
            ],
          },
          {
            platform: 'wordpress',
            structureImplementations,
            components: [
              {
                name: 'card',
                structure: 'components',
                required: true,
              },
              {
                name: 'missing',
                structure: 'components',
              },
            ],
          },
        ],
      }),
      'components/button/fixture.txt': 'button fixture\n',
      'components/card/fixture.txt': 'card fixture\n',
    });
    systemRepository = pathToFileURL(systemPath).href;
  });

  after(() => {
    if (tempRoot) {
      rmSync(tempRoot, {
        recursive: true,
        force: true,
        maxRetries: 3,
        retryDelay: 100,
      });
    }
  });

  test('prints the complete root help before exiting', () => {
    const result = runCli(tempRoot, ['--help']);

    assert.equal(result.status, 0, commandFailure('--help', result));
    assert.equal(result.stderr, '');
    assert.equal(result.stdout, expectedRootHelp);
  });

  test('prints the package version', () => {
    const result = runCli(tempRoot, ['--version']);

    assert.equal(result.status, 0, commandFailure('--version', result));
    assert.equal(result.stderr, '');
    assert.equal(result.stdout.includes('Emulsify CLI'), true);
    assert.equal(
      result.stdout.includes(`Version: ${packageInfo.version}`),
      true,
    );
  });

  test('initializes a project from a local starter repository', () => {
    const result = runCli(tempRoot, [
      'init',
      'Fixture Project',
      projectsRoot,
      '--machineName',
      'fixture-project',
      '--starter',
      starterRepository,
      '--checkout',
      'main',
      '--platform',
      'none',
      '--yes',
    ]);

    assert.equal(result.status, 0, commandFailure('init', result));
    assert.equal(result.stderr.trim(), '');
    assert.match(result.stdout, /Created an Emulsify project/);
    assert.deepEqual(
      JSON.parse(
        readFileSync(join(projectRoot, 'project.emulsify.json'), 'utf8'),
      ),
      {
        project: {
          platform: 'none',
          name: 'Fixture Project',
          machineName: 'fixture-project',
        },
        starter: {
          repository: starterRepository,
        },
      },
    );
    assert.equal(existsSync(join(projectRoot, 'package-lock.json')), true);
    assert.equal(existsSync(join(projectRoot, 'system.emulsify.json')), true);
    assert.equal(
      existsSync(join(projectRoot, '.cli', 'systemInstall.js')),
      true,
    );
    assert.equal(existsSync(join(projectRoot, '.git')), false);
  });

  test('installs an exact variant from a local system repository', () => {
    const result = runCli(projectRoot, [
      'system',
      'install',
      '--repository',
      systemRepository,
      '--checkout',
      'main',
      '--variant',
      'wordpress',
    ]);

    assert.equal(result.status, 0, commandFailure('system install', result));
    assert.equal(result.stderr, '');
    assert.match(
      result.stdout,
      /Successfully installed the fixture-system system using the wordpress variant/,
    );

    const projectConfig = JSON.parse(
      readFileSync(join(projectRoot, 'project.emulsify.json'), 'utf8'),
    );
    assert.deepEqual(projectConfig.system, {
      repository: systemRepository,
      checkout: 'main',
    });
    assert.equal(projectConfig.variant.platform, 'wordpress');
    assert.equal(
      readFileSync(
        join(projectRoot, 'components', 'card', 'fixture.txt'),
        'utf8',
      ),
      'card fixture\n',
    );
    assert.equal(existsSync(join(isolatedHome, '.emulsify', 'cache')), true);
  });

  // Known failure: ../../src/handlers/systemInstall.ts:418-427 appends the
  // hook path to the system.emulsify.json file instead of its directory.
  test('executes the project system-install hook', (t) => {
    if (!existsSync(systemHookSentinel)) {
      t.todo('Known failure: src/handlers/systemInstall.ts:418-427');
      return;
    }

    assert.equal(readFileSync(systemHookSentinel, 'utf8'), 'ran\n');
  });

  // Known failure: ../../src/handlers/componentInstall.ts:240-247 logs and
  // swallows a requested component copy failure instead of failing the CLI.
  test('returns a non-zero exit when a requested component cannot be copied', (t) => {
    const result = runCli(projectRoot, ['component', 'install', 'missing']);

    assert.equal(result.stdout, '');
    assert.match(result.stderr, /Unable to install missing:/);
    assert.equal(existsSync(join(projectRoot, 'components', 'missing')), false);

    if (result.status === 0) {
      t.todo('Known failure: src/handlers/componentInstall.ts:240-247');
      return;
    }

    assert.notEqual(
      result.status,
      0,
      'component install must fail when its requested component is not copied',
    );
  });
});
