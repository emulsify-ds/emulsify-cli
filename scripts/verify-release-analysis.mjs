#!/usr/bin/env node

/**
 * @file Predict semantic-release output without loading publishing plugins.
 */

import { readFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import {
  analyzeReleaseHistory,
  analyzeReleaseType,
  getCommitsInRange,
} from './version-develop.mjs';

/**
 * Read the repository package version.
 *
 * @param {string} cwd - Repository root.
 * @returns {string} Package version.
 */
export function readPackageVersion(cwd) {
  const packageJson = JSON.parse(
    readFileSync(resolve(cwd, 'package.json'), 'utf8'),
  );

  if (
    typeof packageJson.version !== 'string' ||
    packageJson.version.length === 0
  ) {
    throw new Error('package.json must contain a version string.');
  }

  return packageJson.version;
}

/**
 * Require package metadata to equal the cumulative release prediction.
 *
 * @param {object} options - Assertion details.
 * @param {string} options.packageVersion - Current package version.
 * @param {string} options.predictedVersion - Predicted package version.
 * @param {string} options.releaseType - Predicted release type.
 * @param {string} options.releaseTag - Stable base tag.
 * @returns {void}
 */
export function assertPackageVersion({
  packageVersion,
  predictedVersion,
  releaseType,
  releaseTag,
}) {
  if (packageVersion !== predictedVersion) {
    throw new Error(
      `package.json version ${packageVersion} does not match the semantic-release prediction ${predictedVersion} (${releaseType} from ${releaseTag}).`,
    );
  }
}

/**
 * Require a prospective squash title to preserve the aggregate release type.
 *
 * @param {object} options - Assertion details.
 * @param {string} options.squashTitle - Prospective squash title.
 * @param {string|null} options.squashTitleReleaseType - Title-only result.
 * @param {string|null} options.squashReleaseType - Base plus title result.
 * @param {string} options.rangeReleaseType - Full-range result.
 * @returns {void}
 */
export function assertSquashReleaseType({
  squashTitle,
  squashTitleReleaseType,
  squashReleaseType,
  rangeReleaseType,
}) {
  if (!squashTitleReleaseType) {
    throw new Error(
      `Squash title "${squashTitle}" would not produce a semantic release. Use a conventional title such as "feat(scope): ..." or "fix(scope): ...".`,
    );
  }

  if (squashReleaseType !== rangeReleaseType) {
    throw new Error(
      `Squash title "${squashTitle}" predicts a ${squashReleaseType} release, but the full commit range predicts ${rangeReleaseType}.`,
    );
  }
}

/**
 * Predict the release from complete history and an optional squash strategy.
 *
 * @param {object} options - Prediction options.
 * @param {string} options.cwd - Repository root.
 * @param {string} [options.base='origin/main'] - Ref used to select the tag.
 * @param {string} [options.head='HEAD'] - Prospective release head.
 * @param {string} [options.squashTitle] - Prospective squash commit title.
 * @returns {Promise<object>} Verified prediction.
 */
export async function predictRelease({
  cwd,
  base = 'origin/main',
  head = 'HEAD',
  squashTitle,
}) {
  const {
    releaseTag,
    previousVersion,
    releaseType,
    predictedVersion,
    range,
    commits,
  } = await analyzeReleaseHistory({ cwd, base, head });

  if (!releaseType || !predictedVersion) {
    throw new Error(
      `No semantic release is predicted from ${range}. Add a release-producing conventional commit.`,
    );
  }

  const packageVersion = readPackageVersion(cwd);
  assertPackageVersion({
    packageVersion,
    predictedVersion,
    releaseType,
    releaseTag,
  });

  let squashTitleReleaseType;
  let squashReleaseType;
  if (squashTitle !== undefined) {
    const prospectiveSquashCommit = {
      hash: 'prospective-squash',
      message: squashTitle,
    };
    squashTitleReleaseType = await analyzeReleaseType(
      [prospectiveSquashCommit],
      cwd,
    );
    const baseCommits = getCommitsInRange({
      cwd,
      from: releaseTag,
      to: base,
    });
    squashReleaseType = await analyzeReleaseType(
      [prospectiveSquashCommit, ...baseCommits],
      cwd,
    );
    assertSquashReleaseType({
      squashTitle,
      squashTitleReleaseType,
      squashReleaseType,
      rangeReleaseType: releaseType,
    });
  }

  return {
    releaseTag,
    previousVersion,
    releaseType,
    predictedVersion,
    packageVersion,
    range,
    commitCount: commits.length,
    ...(squashTitle === undefined
      ? {}
      : {
          squashTitle,
          squashTitleReleaseType,
          squashReleaseType,
        }),
  };
}

/**
 * Parse one required CLI option value.
 *
 * @param {string[]} argv - Raw CLI arguments.
 * @param {number} index - Current argument index.
 * @param {string} option - Option name.
 * @returns {{value: string, consumed: number}} Parsed value.
 */
function readOption(argv, index, option) {
  const argument = argv[index];
  const inlinePrefix = `${option}=`;

  if (argument.startsWith(inlinePrefix)) {
    const value = argument.slice(inlinePrefix.length);
    if (!value) {
      throw new Error(`${option} requires a value.`);
    }
    return { value, consumed: 0 };
  }

  const value = argv[index + 1];
  if (!value || value.startsWith('--')) {
    throw new Error(`${option} requires a value.`);
  }

  return { value, consumed: 1 };
}

/**
 * Parse analyzer CLI arguments with Core-compatible CI fallbacks.
 *
 * @param {string[]} argv - Raw CLI arguments.
 * @param {NodeJS.ProcessEnv|object} [env=process.env] - Environment values.
 * @returns {object} Analyzer options.
 */
export function parseArgs(argv, env = process.env) {
  const parsed = {
    base: env.RELEASE_FROM || env.RELEASE_BASE || 'origin/main',
    head: env.RELEASE_TO || env.RELEASE_HEAD || 'HEAD',
    squashTitle:
      env.RELEASE_SQUASH_MESSAGE ?? env.RELEASE_SQUASH_TITLE ?? undefined,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (argument === '--help' || argument === '-h') {
      parsed.help = true;
      continue;
    }

    const option = ['--base', '--head', '--squash-title'].find(
      (candidate) =>
        argument === candidate || argument.startsWith(`${candidate}=`),
    );

    if (!option) {
      throw new Error(`Unknown option: ${argument}`);
    }

    const { value, consumed } = readOption(argv, index, option);
    index += consumed;

    if (option === '--base') {
      parsed.base = value;
    } else if (option === '--head') {
      parsed.head = value;
    } else {
      parsed.squashTitle = value;
    }
  }

  return parsed;
}

/**
 * Format CLI usage.
 *
 * @returns {string} Usage text.
 */
export function usage() {
  return [
    'Usage: node scripts/verify-release-analysis.mjs [options]',
    '',
    'Options:',
    '  --base <ref>           Ref used to find the latest stable release tag.',
    '  --head <ref>           Prospective release head. Defaults to HEAD.',
    '  --squash-title <title>  Require a squash title to preserve the release type.',
    '  --help                 Print this help text.',
  ].join('\n');
}

/**
 * Run the non-publishing release predictor.
 *
 * @param {string[]} [argv=process.argv.slice(2)] - CLI arguments.
 * @param {NodeJS.ProcessEnv|object} [env=process.env] - Environment values.
 * @param {string} [cwd=process.cwd()] - Repository root.
 * @returns {Promise<number>} Process exit code.
 */
export async function runCli(
  argv = process.argv.slice(2),
  env = process.env,
  cwd = process.cwd(),
) {
  try {
    const options = parseArgs(argv, env);

    if (options.help) {
      console.log(usage());
      return 0;
    }

    const prediction = await predictRelease({
      cwd,
      base: options.base,
      head: options.head,
      squashTitle: options.squashTitle,
    });

    console.log(
      `semantic-release predicts ${prediction.releaseType}: ${prediction.releaseTag} -> v${prediction.predictedVersion} from ${prediction.commitCount} commits.`,
    );
    if (prediction.squashReleaseType) {
      console.log(
        `Squash title preserves the ${prediction.squashReleaseType} release.`,
      );
    }

    return 0;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    return 1;
  }
}

if (basename(process.argv[1] || '') === 'verify-release-analysis.mjs') {
  runCli().then((exitCode) => {
    process.exitCode = exitCode;
  });
}
