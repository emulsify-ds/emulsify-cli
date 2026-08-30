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
let nonInteractiveInstallProjectRoot;
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
      '.cli/init.js': [
        "import { readFileSync, writeFileSync } from 'node:fs';",
        "const configUrl = new URL('../project.emulsify.json', import.meta.url);",
        "const config = JSON.parse(readFileSync(configUrl, 'utf8'));",
        "config.project.generatedFrom = 'emulsify-wordpress';",
        "config.project.generatedFromVersion = '2.0.0';",
        "config.project.description = 'A generated WordPress child theme.';",
        'writeFileSync(configUrl, `${JSON.stringify(config, null, 2)}\\n`);',
        '',
      ].join('\n'),
      '.cli/systemInstall.js': [
        "import { writeFileSync } from 'node:fs';",
        "writeFileSync(new URL('../system-install-hook-ran.txt', import.meta.url), 'ran\\n');",
        '',
      ].join('\n'),
    });
    starterRepository = pathToFileURL(starterPath).href;

    nonInteractiveInstallProjectRoot = join(
      projectsRoot,
      'non-interactive-install-project',
    );
    mkdirSync(nonInteractiveInstallProjectRoot, { recursive: true });
    writeFileSync(
      join(nonInteractiveInstallProjectRoot, 'project.emulsify.json'),
      json({
        project: {
          platform: 'none',
          name: 'Non-interactive Install Project',
          machineName: 'non-interactive-install-project',
        },
        starter: {
          repository: starterRepository,
        },
      }),
    );

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

  test('fails fast when component create has no name outside a TTY', () => {
    const result = runCli(tempRoot, ['component', 'create']);

    assert.notEqual(result.status, 0);
    assert.equal(result.stdout, '');
    assert.match(
      result.stderr,
      /Please specify a name for the new component\./,
    );
  });

  test('fails fast when component install has no target outside a TTY', () => {
    const result = runCli(tempRoot, ['component', 'install']);

    assert.notEqual(result.status, 0);
    assert.equal(result.stdout, '');
    assert.match(
      result.stderr,
      /Please specify a component to install, or pass --all to install all available components\./,
    );
  });

  test('fails fast when system create has no values outside a TTY', () => {
    const result = runCli(tempRoot, ['system', 'create']);

    assert.notEqual(result.status, 0);
    assert.equal(result.stdout, '');
    assert.match(
      result.stderr,
      /Pass the \[name\] positional argument or use --yes/,
    );
    assert.equal(existsSync(join(tempRoot, 'custom-system')), false);
  });

  test('fails fast without changing the project when system install has no source outside a TTY', () => {
    const projectConfigPath = join(
      nonInteractiveInstallProjectRoot,
      'project.emulsify.json',
    );
    const configBefore = readFileSync(projectConfigPath, 'utf8');
    const result = runCli(nonInteractiveInstallProjectRoot, [
      'system',
      'install',
    ]);

    assert.notEqual(result.status, 0);
    assert.equal(result.stdout, '');
    assert.match(result.stderr, /positional argument/);
    assert.match(result.stderr, /--repository/);
    assert.match(result.stderr, /--checkout/);
    assert.equal(readFileSync(projectConfigPath, 'utf8'), configBefore);
  });

  test('creates a standalone system and installs it from a local path', () => {
    const systemName = 'round-trip-system';
    const generatedSystemRoot = join(tempRoot, systemName);
    const generatedProjectRoot = join(projectsRoot, 'round-trip-project');
    const createResult = runCli(tempRoot, [
      'system',
      'create',
      'Round Trip System',
      '--directory',
      tempRoot,
      '--platform',
      'drupal || wordpress',
      '--git',
    ]);

    assert.equal(
      createResult.status,
      0,
      commandFailure('system create', createResult),
    );
    assert.equal(createResult.stderr, '');
    assert.match(createResult.stdout, /Created the round-trip-system system/);
    assert.equal(existsSync(join(generatedSystemRoot, '.git')), true);
    assert.equal(existsSync(join(generatedSystemRoot, 'README.md')), true);
    assert.equal(existsSync(join(generatedSystemRoot, '.gitignore')), true);
    assert.equal(existsSync(join(generatedSystemRoot, 'LICENSE')), true);

    const systemConfig = JSON.parse(
      readFileSync(join(generatedSystemRoot, 'system.emulsify.json'), 'utf8'),
    );
    assert.equal(systemConfig.name, systemName);
    assert.equal(systemConfig.variants[0].platform, 'drupal || wordpress');
    assert.deepEqual(systemConfig.variants[0].components, [
      {
        name: 'example-card',
        structure: 'components',
        description: 'Example card included with the generated system',
        required: true,
      },
    ]);

    git(generatedSystemRoot, ['add', '.']);
    git(generatedSystemRoot, [
      '-c',
      'user.email=e2e@example.test',
      '-c',
      'user.name=Emulsify E2E',
      'commit',
      '-m',
      'test: commit generated system',
    ]);

    const initResult = runCli(tempRoot, [
      'init',
      'Round Trip Project',
      projectsRoot,
      '--machineName',
      'round-trip-project',
      '--starter',
      starterRepository,
      '--checkout',
      'main',
      '--platform',
      'wordpress',
      '--yes',
    ]);
    assert.equal(
      initResult.status,
      0,
      commandFailure('round-trip init', initResult),
    );

    const installResult = runCli(generatedProjectRoot, [
      'system',
      'install',
      '--repository',
      generatedSystemRoot,
      '--checkout',
      'main',
    ]);
    assert.equal(
      installResult.status,
      0,
      commandFailure('round-trip system install', installResult),
    );
    assert.match(
      installResult.stdout,
      /Successfully installed the round-trip-system system using the drupal \|\| wordpress variant/,
    );

    const installedComponentRoot = join(
      generatedProjectRoot,
      'components',
      'example-card',
    );
    for (const extension of ['twig', 'scss', 'yml', 'stories.js']) {
      assert.equal(
        existsSync(join(installedComponentRoot, `example-card.${extension}`)),
        true,
        `generated example-card.${extension} should install`,
      );
    }
  });

  test('initializes a WordPress project with starter hook metadata', () => {
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
      'wordpress',
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
          platform: 'wordpress',
          name: 'Fixture Project',
          machineName: 'fixture-project',
          generatedFrom: 'emulsify-wordpress',
          generatedFromVersion: '2.0.0',
          description: 'A generated WordPress child theme.',
        },
        starter: {
          repository: starterRepository,
        },
      },
    );
    assert.equal(existsSync(join(projectRoot, 'package-lock.json')), true);
    assert.equal(
      existsSync(join(projectRoot, '.cli', 'systemInstall.js')),
      true,
    );
    assert.equal(existsSync(join(projectRoot, '.git')), false);
  });

  test('loads starter hook metadata when installing a system', () => {
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

  test('executes the project system-install hook', () => {
    assert.equal(
      existsSync(systemHookSentinel),
      true,
      'system install must execute the project hook',
    );
    assert.equal(readFileSync(systemHookSentinel, 'utf8'), 'ran\n');
  });

  test('returns a non-zero exit when a requested component cannot be copied', () => {
    const result = runCli(projectRoot, ['component', 'install', 'missing']);

    assert.equal(result.stdout, '');
    assert.match(result.stderr, /Unable to install missing:/);
    assert.equal(existsSync(join(projectRoot, 'components', 'missing')), false);

    assert.notEqual(
      result.status,
      0,
      'component install must fail when its requested component is not copied',
    );
  });
});
