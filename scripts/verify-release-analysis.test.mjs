/**
 * @file Tests for safe, non-publishing release prediction.
 */

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import {
  assertPackageVersion,
  assertSquashReleaseType,
  parseArgs,
  predictRelease,
} from './verify-release-analysis.mjs';

function git(cwd, args) {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function writePackageMetadata(cwd, version) {
  writeFileSync(
    join(cwd, 'package.json'),
    `${JSON.stringify(
      {
        name: 'emulsify-cli-release-verifier',
        version,
      },
      null,
      2,
    )}\n`,
  );
  writeFileSync(
    join(cwd, 'package-lock.json'),
    `${JSON.stringify(
      {
        name: 'emulsify-cli-release-verifier',
        version,
        lockfileVersion: 3,
        packages: {
          '': {
            name: 'emulsify-cli-release-verifier',
            version,
          },
        },
      },
      null,
      2,
    )}\n`,
  );
}

function commitAll(cwd, message) {
  git(cwd, ['add', '.']);
  git(cwd, ['commit', '-m', message]);
}

function createReleaseRepository(t) {
  const cwd = mkdtempSync(join(tmpdir(), 'emulsify-cli-verifier-'));
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
  git(cwd, ['tag', 'v1.0.0']);
  git(cwd, ['branch', 'release-base']);

  return repository;
}

function addCommit(repository, message) {
  repository.changeIndex += 1;
  const filename = `change-${String(repository.changeIndex).padStart(3, '0')}.txt`;
  writeFileSync(join(repository.cwd, filename), `${message}\n`);
  commitAll(repository.cwd, message);
}

test('safe analyzer accepts an equivalent squash title', async (t) => {
  const repository = createReleaseRepository(t);
  addCommit(repository, 'feat(cli): add public command');
  writePackageMetadata(repository.cwd, '1.1.0');
  commitAll(repository.cwd, 'chore(release): pre-bump minor version');

  const prediction = await predictRelease({
    cwd: repository.cwd,
    base: 'release-base',
    squashTitle: 'feat(release): add public command',
  });

  assert.equal(prediction.releaseType, 'minor');
  assert.equal(prediction.predictedVersion, '1.1.0');
  assert.equal(prediction.squashTitleReleaseType, 'minor');
  assert.equal(prediction.squashReleaseType, 'minor');
});

test('safe analyzer rejects package version mismatch', async (t) => {
  const repository = createReleaseRepository(t);
  addCommit(repository, 'feat(cli): add public command');

  await assert.rejects(
    predictRelease({
      cwd: repository.cwd,
      base: 'release-base',
    }),
    /package\.json version 1\.0\.0 does not match.*1\.1\.0/,
  );
});

test('safe analyzer rejects non-release and mismatched squash titles', async (t) => {
  const repository = createReleaseRepository(t);
  addCommit(repository, 'feat(cli): add public command');
  writePackageMetadata(repository.cwd, '1.1.0');

  await assert.rejects(
    predictRelease({
      cwd: repository.cwd,
      base: 'release-base',
      squashTitle: 'chore(release): prepare command',
    }),
    /would not produce a semantic release/,
  );
  await assert.rejects(
    predictRelease({
      cwd: repository.cwd,
      base: 'release-base',
      squashTitle: 'fix(release): prepare command',
    }),
    /predicts a patch release, but the full commit range predicts minor/,
  );
});

test('prospective squash analysis includes release-producing base commits', async (t) => {
  const repository = createReleaseRepository(t);

  git(repository.cwd, ['switch', 'release-base']);
  addCommit(repository, 'feat(cli): add base command');

  git(repository.cwd, ['switch', 'main']);
  addCommit(repository, 'fix(cli): repair prospective command');
  git(repository.cwd, [
    'merge',
    '--no-ff',
    'release-base',
    '-m',
    'Merge release base into prospective head',
  ]);
  writePackageMetadata(repository.cwd, '1.1.0');
  commitAll(repository.cwd, 'chore(release): pre-bump minor version');

  const prediction = await predictRelease({
    cwd: repository.cwd,
    base: 'release-base',
    head: 'main',
    squashTitle: 'fix(release): repair prospective command',
  });

  assert.equal(prediction.releaseType, 'minor');
  assert.equal(prediction.squashTitleReleaseType, 'patch');
  assert.equal(prediction.squashReleaseType, 'minor');
});

test('safe analyzer rejects history without a release-producing commit', async (t) => {
  const repository = createReleaseRepository(t);
  addCommit(repository, 'docs: clarify command usage');

  await assert.rejects(
    predictRelease({
      cwd: repository.cwd,
      base: 'release-base',
    }),
    /No semantic release is predicted/,
  );
});

test('analyzer CLI arguments use Core-compatible environment fallbacks', () => {
  const env = {
    RELEASE_FROM: 'base-from-env',
    RELEASE_TO: 'head-from-env',
    RELEASE_SQUASH_MESSAGE: 'feat(release): from environment',
  };

  assert.deepEqual(parseArgs([], env), {
    base: 'base-from-env',
    head: 'head-from-env',
    squashTitle: 'feat(release): from environment',
    help: false,
  });
  assert.deepEqual(
    parseArgs(
      [
        '--base=base-from-cli',
        '--head',
        'head-from-cli',
        '--squash-title',
        'fix(release): from CLI',
      ],
      env,
    ),
    {
      base: 'base-from-cli',
      head: 'head-from-cli',
      squashTitle: 'fix(release): from CLI',
      help: false,
    },
  );
  assert.throws(() => parseArgs(['--unknown'], env), /Unknown option/);
  assert.throws(() => parseArgs(['--head'], env), /requires a value/);
});

test('assertion helpers report actionable version and squash failures', () => {
  assert.throws(
    () =>
      assertPackageVersion({
        packageVersion: '2.2.0',
        predictedVersion: '2.3.0',
        releaseType: 'minor',
        releaseTag: 'v2.2.0',
      }),
    /semantic-release prediction 2\.3\.0/,
  );
  assert.throws(
    () =>
      assertSquashReleaseType({
        squashTitle: 'chore: prepare release',
        squashTitleReleaseType: null,
        squashReleaseType: null,
        rangeReleaseType: 'minor',
      }),
    /would not produce a semantic release/,
  );
});
