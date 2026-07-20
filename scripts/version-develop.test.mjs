/**
 * @file Deterministic tests for non-publishing release calculation.
 */

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import releaseAnalysisConfig from '../config/release-analysis.cjs';
import {
  analyzeReleaseHistory,
  analyzeReleaseType,
  getLatestReleaseTag,
  parseGitLog,
  parseReleaseTag,
  parseVersionDevelopArgs,
  runVersionBump,
} from './version-develop.mjs';

const require = createRequire(import.meta.url);
const semanticReleaseConfig = require('../release.config.cjs');
const silentLogger = {
  log: () => {},
};

function git(cwd, args) {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function writePackageMetadata(cwd, packageVersion, lockVersions = {}) {
  const lockVersion = lockVersions.lockVersion ?? packageVersion;
  const rootVersion = lockVersions.rootVersion ?? packageVersion;

  writeFileSync(
    join(cwd, 'package.json'),
    `${JSON.stringify(
      {
        name: 'emulsify-cli-release-fixture',
        version: packageVersion,
      },
      null,
      2,
    )}\n`,
  );
  writeFileSync(
    join(cwd, 'package-lock.json'),
    `${JSON.stringify(
      {
        name: 'emulsify-cli-release-fixture',
        version: lockVersion,
        lockfileVersion: 3,
        packages: {
          '': {
            name: 'emulsify-cli-release-fixture',
            version: rootVersion,
          },
        },
      },
      null,
      2,
    )}\n`,
  );
}

function readVersions(cwd) {
  const packageJson = JSON.parse(
    readFileSync(join(cwd, 'package.json'), 'utf8'),
  );
  const packageLock = JSON.parse(
    readFileSync(join(cwd, 'package-lock.json'), 'utf8'),
  );

  return [
    packageJson.version,
    packageLock.version,
    packageLock.packages[''].version,
  ];
}

function commitAll(cwd, message) {
  git(cwd, ['add', '.']);
  git(cwd, ['commit', '-m', message]);
}

function createReleaseRepository(t, { tag = 'v1.0.0' } = {}) {
  const cwd = mkdtempSync(join(tmpdir(), 'emulsify-cli-release-'));
  const repository = {
    cwd,
    changeIndex: 0,
  };

  t.after(() => {
    rmSync(cwd, { recursive: true, force: true });
  });

  git(cwd, ['init', '--initial-branch=main']);
  git(cwd, ['config', 'user.name', 'Release Test']);
  git(cwd, ['config', 'user.email', 'release-test@example.com']);
  writePackageMetadata(cwd, '1.0.0');
  commitAll(cwd, 'chore: establish release fixture');
  if (tag) {
    git(cwd, ['tag', tag]);
  }
  git(cwd, ['branch', 'release-base']);

  return repository;
}

function addCommit(repository, message) {
  repository.changeIndex += 1;
  const filename = `change-${String(repository.changeIndex).padStart(3, '0')}.txt`;
  writeFileSync(join(repository.cwd, filename), `${message}\n`);
  commitAll(repository.cwd, message);
}

test('shared analyzer config uses Angular parsing without custom rules', () => {
  assert.deepEqual(releaseAnalysisConfig.commitAnalyzerOptions, {
    preset: 'angular',
    parserOpts: {
      noteKeywords: ['BREAKING CHANGE', 'BREAKING CHANGES', 'BREAKING'],
    },
  });
  assert.equal(
    Object.hasOwn(releaseAnalysisConfig.commitAnalyzerOptions, 'releaseRules'),
    false,
  );
  assert.equal(
    releaseAnalysisConfig.commitAnalyzerOptions.parserOpts,
    releaseAnalysisConfig.parserOpts,
  );

  const commitAnalyzer = semanticReleaseConfig.plugins.find(
    (plugin) =>
      Array.isArray(plugin) &&
      plugin[0] === '@semantic-release/commit-analyzer',
  );
  const releaseNotes = semanticReleaseConfig.plugins.find(
    (plugin) =>
      Array.isArray(plugin) &&
      plugin[0] === '@semantic-release/release-notes-generator',
  );

  assert.deepEqual(commitAnalyzer, [
    '@semantic-release/commit-analyzer',
    releaseAnalysisConfig.commitAnalyzerOptions,
  ]);
  assert.deepEqual(
    releaseNotes[1].parserOpts,
    releaseAnalysisConfig.parserOpts,
  );
});

test('structured git log parsing preserves complete commit messages', () => {
  assert.deepEqual(
    parseGitLog(
      '\x1eabc123\0feat: add command\n\nBody text\n\x1edef456\0fix: repair command\n',
    ),
    [
      {
        hash: 'abc123',
        message: 'feat: add command\n\nBody text',
      },
      {
        hash: 'def456',
        message: 'fix: repair command',
      },
    ],
  );
});

test('public semantic-release analyzer covers patch, minor, major, and no release', async () => {
  const cwd = process.cwd();

  assert.equal(
    await analyzeReleaseType(
      [{ hash: 'patch', message: 'fix(cli): repair output' }],
      cwd,
    ),
    'patch',
  );
  assert.equal(
    await analyzeReleaseType(
      [{ hash: 'minor', message: 'feat(cli): add output mode' }],
      cwd,
    ),
    'minor',
  );
  assert.equal(
    await analyzeReleaseType(
      [
        {
          hash: 'major',
          message:
            'feat(cli): replace output mode\n\nBREAKING CHANGE: replace the output contract',
        },
      ],
      cwd,
    ),
    'major',
  );
  assert.equal(
    await analyzeReleaseType(
      [{ hash: 'none', message: 'chore(cli): update metadata' }],
      cwd,
    ),
    null,
  );
});

test('stable tag selection is reachable, exact, and version-sorted', (t) => {
  const repository = createReleaseRepository(t, { tag: 'v1.9.0' });
  addCommit(repository, 'chore: establish later stable release');
  git(repository.cwd, ['tag', 'v1.10.0']);
  git(repository.cwd, ['tag', 'v2.0.0-beta.1']);
  git(repository.cwd, ['tag', '1.11.0']);

  git(repository.cwd, ['switch', '--detach', 'v1.9.0']);
  addCommit(repository, 'chore: create unreachable release line');
  git(repository.cwd, ['tag', 'v9.0.0']);
  git(repository.cwd, ['switch', 'main']);

  assert.equal(
    getLatestReleaseTag({ cwd: repository.cwd, base: 'main' }),
    'v1.10.0',
  );
  assert.equal(parseReleaseTag('v1.10.0'), '1.10.0');
  assert.throws(
    () => parseReleaseTag('v1.10.0-beta.1'),
    /Expected a stable tag/,
  );
});

test('release analysis fails clearly when stable history is missing', async (t) => {
  const repository = createReleaseRepository(t, { tag: null });
  addCommit(repository, 'fix(cli): repair command');

  await assert.rejects(
    analyzeReleaseHistory({
      cwd: repository.cwd,
      base: 'release-base',
    }),
    /No stable semantic-release tag is reachable/,
  );
});

test('develop uses a newer stable tag on main that is not its ancestor', async (t) => {
  const repository = createReleaseRepository(t);
  git(repository.cwd, ['branch', 'develop']);
  git(repository.cwd, ['switch', 'develop']);
  addCommit(repository, 'feat(cli): add released command');
  writePackageMetadata(repository.cwd, '1.1.0');
  commitAll(repository.cwd, 'chore(release): pre-bump minor version');

  git(repository.cwd, ['switch', 'main']);
  git(repository.cwd, [
    'merge',
    '--no-ff',
    'develop',
    '-m',
    'Merge develop for v1.1.0',
  ]);
  git(repository.cwd, ['tag', 'v1.1.0']);

  git(repository.cwd, ['switch', 'develop']);
  addCommit(repository, 'fix(cli): repair command after release');

  const result = await runVersionBump({
    cwd: repository.cwd,
    base: 'main',
    to: 'develop',
    logger: silentLogger,
  });

  assert.deepEqual(result, {
    changed: true,
    releaseType: 'patch',
    version: '1.1.1',
  });
  assert.deepEqual(readVersions(repository.cwd), ['1.1.1', '1.1.1', '1.1.1']);
  assert.notEqual(
    git(repository.cwd, ['rev-parse', 'v1.1.0']),
    git(repository.cwd, ['merge-base', 'v1.1.0', 'develop']),
  );
});

test('cumulative develop analysis does not increment a pre-bumped version again', async (t) => {
  const repository = createReleaseRepository(t);
  addCommit(repository, 'feat(cli): add public command');
  writePackageMetadata(repository.cwd, '1.1.0');
  commitAll(repository.cwd, 'chore(release): pre-bump minor version');
  addCommit(repository, 'fix(cli): repair public command');

  const packageBefore = readFileSync(
    join(repository.cwd, 'package.json'),
    'utf8',
  );
  const lockBefore = readFileSync(
    join(repository.cwd, 'package-lock.json'),
    'utf8',
  );
  const result = await runVersionBump({
    cwd: repository.cwd,
    base: 'release-base',
    logger: silentLogger,
  });

  assert.deepEqual(result, {
    changed: false,
    releaseType: 'minor',
    version: '1.1.0',
  });
  assert.equal(
    readFileSync(join(repository.cwd, 'package.json'), 'utf8'),
    packageBefore,
  );
  assert.equal(
    readFileSync(join(repository.cwd, 'package-lock.json'), 'utf8'),
    lockBefore,
  );
  assert.equal(git(repository.cwd, ['status', '--porcelain']), '');
});

test('develop bump repairs package and lock metadata to the exact prediction', async (t) => {
  const repository = createReleaseRepository(t);
  addCommit(repository, 'fix(cli): repair public command');
  writePackageMetadata(repository.cwd, '9.0.0', {
    lockVersion: '8.0.0',
    rootVersion: '7.0.0',
  });

  const result = await runVersionBump({
    cwd: repository.cwd,
    base: 'release-base',
    logger: silentLogger,
  });

  assert.deepEqual(result, {
    changed: true,
    releaseType: 'patch',
    version: '1.0.1',
  });
  assert.deepEqual(readVersions(repository.cwd), ['1.0.1', '1.0.1', '1.0.1']);
});

test('develop bump leaves non-release history unchanged', async (t) => {
  const repository = createReleaseRepository(t);
  addCommit(repository, 'docs: clarify command usage');
  const before = [
    readFileSync(join(repository.cwd, 'package.json'), 'utf8'),
    readFileSync(join(repository.cwd, 'package-lock.json'), 'utf8'),
  ];

  const result = await runVersionBump({
    cwd: repository.cwd,
    base: 'release-base',
    logger: silentLogger,
  });

  assert.deepEqual(result, {
    changed: false,
    releaseType: null,
  });
  assert.deepEqual(
    [
      readFileSync(join(repository.cwd, 'package.json'), 'utf8'),
      readFileSync(join(repository.cwd, 'package-lock.json'), 'utf8'),
    ],
    before,
  );
});

test('develop CLI arguments use positional refs before environment fallbacks', () => {
  const env = {
    RELEASE_BASE: 'base-from-env',
    RELEASE_TO: 'head-from-env',
  };

  assert.deepEqual(parseVersionDevelopArgs([], env), {
    base: 'base-from-env',
    to: 'head-from-env',
  });
  assert.deepEqual(
    parseVersionDevelopArgs(['base-positional', 'head-positional'], env),
    {
      base: 'base-positional',
      to: 'head-positional',
    },
  );
  assert.throws(
    () => parseVersionDevelopArgs(['base', 'head', 'extra'], env),
    /Usage:/,
  );
});
