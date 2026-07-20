#!/usr/bin/env node

/**
 * @file Update package metadata from complete unreleased semantic history.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { analyzeCommits } from '@semantic-release/commit-analyzer';
import releaseAnalysisConfig from '../config/release-analysis.cjs';

const RELEASE_TAG = /^v((?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*))$/;
const VERSION = /^(\d+)\.(\d+)\.(\d+)(?:-.+)?$/;
const RELEASE_TYPES = new Set(['major', 'minor', 'patch']);
const { commitAnalyzerOptions } = releaseAnalysisConfig;
const analyzerLogger = {
  log: () => {},
};

/**
 * Run git and preserve its diagnostics when it fails.
 *
 * @param {string} cwd - Repository root.
 * @param {string[]} args - Git arguments.
 * @returns {string} Standard output.
 */
function git(cwd, args) {
  try {
    return execFileSync('git', args, {
      cwd,
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (error) {
    const stderr =
      error && typeof error === 'object' && 'stderr' in error
        ? String(error.stderr).trim()
        : '';
    const detail = stderr ? `: ${stderr}` : '';
    throw new Error(`git ${args.join(' ')} failed${detail}`, {
      cause: error,
    });
  }
}

/**
 * Parse git log records containing a hash and complete commit message.
 *
 * @param {string} output - Git log output using record and field separators.
 * @returns {{hash: string, message: string}[]} Semantic-release commits.
 */
export function parseGitLog(output) {
  return output
    .split('\x1e')
    .map((record) => record.trim())
    .filter(Boolean)
    .map((record) => {
      const separator = record.indexOf('\0');

      if (separator < 1) {
        return null;
      }

      return {
        hash: record.slice(0, separator).trim(),
        message: record.slice(separator + 1).trim(),
      };
    })
    .filter(
      (commit) =>
        commit !== null && Boolean(commit.hash) && Boolean(commit.message),
    );
}

/**
 * Parse a stable semantic-release tag.
 *
 * @param {string} tag - Candidate tag.
 * @returns {string} Version without its v prefix.
 */
export function parseReleaseTag(tag) {
  const match = RELEASE_TAG.exec(String(tag).trim());

  if (!match) {
    throw new Error(
      `Unsupported release tag "${tag}". Expected a stable tag such as v2.3.0.`,
    );
  }

  return match[1];
}

/**
 * Find the highest stable release tag reachable from a ref.
 *
 * Git version-sorts all reachable v-prefixed tags first. Filtering with the
 * strict stable-tag expression excludes prereleases and unrelated tag names.
 *
 * @param {{cwd: string, base?: string}} options - Git selection options.
 * @returns {string} Highest reachable stable release tag.
 */
export function getLatestReleaseTag({ cwd, base = 'origin/main' }) {
  const output = git(cwd, [
    'tag',
    '--merged',
    base,
    '--list',
    'v[0-9]*',
    '--sort=-version:refname',
  ]);
  const releaseTag = output
    .split('\n')
    .map((tag) => tag.trim())
    .find((tag) => RELEASE_TAG.test(tag));

  if (!releaseTag) {
    throw new Error(
      `No stable semantic-release tag is reachable from "${base}".`,
    );
  }

  return releaseTag;
}

/**
 * Read complete commit messages from a revision range.
 *
 * @param {{cwd: string, from?: string, to?: string}} options - Git range.
 * @returns {{hash: string, message: string}[]} Semantic-release commits.
 */
export function getCommitsInRange({ cwd, from, to = 'HEAD' }) {
  const range = from ? `${from}..${to}` : to;
  const output = git(cwd, ['log', '--format=%x1e%H%x00%B', range, '--']);

  return parseGitLog(output);
}

/**
 * Analyze commits with the same public plugin and options as semantic-release.
 *
 * @param {{hash: string, message: string}[]} commits - Commits to analyze.
 * @param {string} cwd - Repository root.
 * @returns {Promise<string|null>} Release type or null.
 */
export async function analyzeReleaseType(commits, cwd) {
  return analyzeCommits(commitAnalyzerOptions, {
    commits,
    cwd,
    logger: analyzerLogger,
  });
}

/**
 * Increment a stable version by a semantic release type.
 *
 * @param {string} version - Stable version without a v prefix.
 * @param {string} releaseType - major, minor, or patch.
 * @returns {string} Incremented stable version.
 */
export function incrementVersion(version, releaseType) {
  if (!RELEASE_TYPES.has(releaseType)) {
    throw new Error(`Unsupported release type: ${releaseType}`);
  }

  const match = VERSION.exec(version);
  if (!match) {
    throw new Error(`Unsupported package version: ${version}`);
  }

  let major = Number(match[1]);
  let minor = Number(match[2]);
  let patch = Number(match[3]);

  if (releaseType === 'major') {
    major += 1;
    minor = 0;
    patch = 0;
  } else if (releaseType === 'minor') {
    minor += 1;
    patch = 0;
  } else {
    patch += 1;
  }

  return `${major}.${minor}.${patch}`;
}

/**
 * Analyze all unreleased commits from the base's latest stable tag to a head.
 *
 * @param {object} options - Analysis options.
 * @param {string} options.cwd - Repository root.
 * @param {string} [options.base='origin/main'] - Ref used to select the tag.
 * @param {string} [options.head='HEAD'] - Prospective release head.
 * @returns {Promise<object>} Release prediction and analyzed commits.
 */
export async function analyzeReleaseHistory({
  cwd,
  base = 'origin/main',
  head = 'HEAD',
}) {
  const releaseTag = getLatestReleaseTag({ cwd, base });
  const previousVersion = parseReleaseTag(releaseTag);
  const commits = getCommitsInRange({
    cwd,
    from: releaseTag,
    to: head,
  });
  const releaseType = await analyzeReleaseType(commits, cwd);

  return {
    releaseTag,
    previousVersion,
    releaseType,
    predictedVersion: releaseType
      ? incrementVersion(previousVersion, releaseType)
      : null,
    range: `${releaseTag}..${head}`,
    commits,
  };
}

/**
 * Apply one version to package.json and every root lockfile version field.
 *
 * @param {object} packageJson - Parsed package manifest.
 * @param {object} packageLock - Parsed package lock.
 * @param {string} version - Exact predicted version.
 * @returns {void}
 */
export function updatePackageVersions(packageJson, packageLock, version) {
  if (
    !packageLock.packages ||
    typeof packageLock.packages[''] !== 'object' ||
    packageLock.packages[''] === null
  ) {
    throw new Error('package-lock.json must contain a packages[""] entry.');
  }

  packageJson.version = version;
  packageLock.version = version;
  packageLock.packages[''].version = version;
}

/**
 * Read JSON from disk.
 *
 * @param {string} path - JSON file path.
 * @returns {object} Parsed JSON.
 */
function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

/**
 * Write stable, newline-terminated JSON.
 *
 * @param {string} path - JSON file path.
 * @param {object} value - JSON value.
 * @returns {void}
 */
function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

/**
 * Update package metadata from the complete cumulative release calculation.
 *
 * @param {object} options - Runtime options.
 * @param {string} options.cwd - Repository root.
 * @param {string} [options.base='origin/main'] - Ref used to select the tag.
 * @param {string} [options.to='HEAD'] - Prospective release head.
 * @param {{log: (...args: unknown[]) => void}} [options.logger=console]
 *   Output logger.
 * @returns {Promise<object>} Change and release details.
 */
export async function runVersionBump({
  cwd,
  base = 'origin/main',
  to = 'HEAD',
  logger = console,
}) {
  const { releaseType, predictedVersion, releaseTag } =
    await analyzeReleaseHistory({
      cwd,
      base,
      head: to,
    });

  if (!releaseType) {
    logger.log('No semantic version bump detected.');
    return {
      changed: false,
      releaseType: null,
    };
  }

  const packageJsonPath = resolve(cwd, 'package.json');
  const packageLockPath = resolve(cwd, 'package-lock.json');
  const packageJson = readJson(packageJsonPath);
  const packageLock = readJson(packageLockPath);
  const currentVersions = [
    packageJson.version,
    packageLock.version,
    packageLock.packages?.['']?.version,
  ];
  const versionsMatch = currentVersions.every(
    (version) => version === predictedVersion,
  );

  if (versionsMatch) {
    logger.log(
      `Package metadata already matches ${predictedVersion} (${releaseType} from ${releaseTag}).`,
    );
    return {
      changed: false,
      releaseType,
      version: predictedVersion,
    };
  }

  updatePackageVersions(packageJson, packageLock, predictedVersion);
  writeJson(packageJsonPath, packageJson);
  writeJson(packageLockPath, packageLock);
  logger.log(
    `Repaired package metadata (${currentVersions.join(', ')}) to ${predictedVersion} (${releaseType} from ${releaseTag}).`,
  );

  return {
    changed: true,
    releaseType,
    version: predictedVersion,
  };
}

/**
 * Parse the positional develop-version CLI used by automation.
 *
 * @param {string[]} argv - Positional base and head refs.
 * @param {NodeJS.ProcessEnv|object} [env=process.env] - Environment values.
 * @returns {{base: string, to: string}} Parsed refs.
 */
export function parseVersionDevelopArgs(argv, env = process.env) {
  if (argv.length > 2) {
    throw new Error(
      'Usage: node scripts/version-develop.mjs [base-ref] [head-ref]',
    );
  }

  return {
    base: argv[0] || env.RELEASE_BASE || env.RELEASE_FROM || 'origin/main',
    to:
      argv[1] || env.GITHUB_SHA || env.RELEASE_TO || env.RELEASE_HEAD || 'HEAD',
  };
}

if (basename(process.argv[1] || '') === 'version-develop.mjs') {
  const { base, to } = parseVersionDevelopArgs(process.argv.slice(2));

  runVersionBump({
    cwd: process.cwd(),
    base,
    to,
  }).catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
