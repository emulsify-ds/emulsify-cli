/** @file Updates develop package metadata from semantic commit messages. */
import { execFileSync } from 'child_process';
import { readFile, writeFile } from 'fs/promises';

type ReleaseType = 'major' | 'minor' | 'patch';

type Version = {
  major: number;
  minor: number;
  patch: number;
};

const zeroSha = /^0{40}$/;
const commitSeparator = '\n---EMULSIFY-COMMIT---\n';

/**
 * Converts a version string into numeric semver parts.
 *
 * @param version version string, with an optional leading v.
 * @returns Numeric major, minor, and patch values.
 */
export function parseVersion(version: string): Version {
  const match = /^v?(\d+)\.(\d+)\.(\d+)(?:-.+)?$/.exec(version);

  if (!match) {
    throw new Error(`Unsupported version format: ${version}`);
  }

  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  };
}

/**
 * Formats numeric semver parts as a package version string.
 *
 * @param version Numeric semver parts.
 * @returns A version string in major.minor.patch format.
 */
export function formatVersion(version: Version): string {
  return `${version.major}.${version.minor}.${version.patch}`;
}

/**
 * Compares two numeric semver versions.
 *
 * @param left Version on the left side of the comparison.
 * @param right Version on the right side of the comparison.
 * @returns 1 when left is greater, -1 when right is greater, and 0 when equal.
 */
export function compareVersions(left: Version, right: Version): number {
  if (left.major !== right.major) {
    return left.major > right.major ? 1 : -1;
  }

  if (left.minor !== right.minor) {
    return left.minor > right.minor ? 1 : -1;
  }

  if (left.patch !== right.patch) {
    return left.patch > right.patch ? 1 : -1;
  }

  return 0;
}

/**
 * Increments a version by the requested release type.
 *
 * @param version Version to increment.
 * @param releaseType Semantic release type to apply.
 * @returns The next version for the release type.
 */
export function incrementVersion(
  version: Version,
  releaseType: ReleaseType,
): Version {
  if (releaseType === 'major') {
    return { major: version.major + 1, minor: 0, patch: 0 };
  }

  if (releaseType === 'minor') {
    return { major: version.major, minor: version.minor + 1, patch: 0 };
  }

  return {
    major: version.major,
    minor: version.minor,
    patch: version.patch + 1,
  };
}

/**
 * Determines the highest release type represented by semantic commit messages.
 *
 * @param messages Full commit messages to inspect.
 * @returns The highest required release type, or undefined when no release is needed.
 */
export function getReleaseType(messages: string[]): ReleaseType | undefined {
  if (messages.some((message) => hasBreakingChange(message))) {
    return 'major';
  }

  if (messages.some((message) => /^feat(?:\([^)]+\))?:/m.test(message))) {
    return 'minor';
  }

  if (
    messages.some((message) => /^(?:fix|perf)(?:\([^)]+\))?:/m.test(message))
  ) {
    return 'patch';
  }

  return undefined;
}

/**
 * Updates package and lockfile metadata to the supplied version.
 *
 * @param version Version string to write.
 * @returns A promise that resolves after both files are updated.
 */
async function updatePackageMetadata(version: string): Promise<void> {
  const packageJson = JSON.parse(await readFile('package.json', 'utf8'));
  const packageLockJson = JSON.parse(
    await readFile('package-lock.json', 'utf8'),
  );

  packageJson.version = version;
  packageLockJson.version = version;

  if (packageLockJson.packages?.['']) {
    packageLockJson.packages[''].version = version;
  }

  await Promise.all([
    writeFile('package.json', `${JSON.stringify(packageJson, null, 2)}\n`),
    writeFile(
      'package-lock.json',
      `${JSON.stringify(packageLockJson, null, 2)}\n`,
    ),
  ]);
}

/**
 * Reads the repository package version.
 *
 * @returns A promise resolving to the package.json version.
 */
async function getCurrentPackageVersion(): Promise<Version> {
  const packageJson = JSON.parse(await readFile('package.json', 'utf8'));
  return parseVersion(packageJson.version);
}

/**
 * Finds the latest reachable git tag.
 *
 * @returns The latest tag name, or undefined when no tag is available.
 */
function getLatestTag(): string | undefined {
  try {
    return execFileSync('git', ['describe', '--tags', '--abbrev=0'], {
      encoding: 'utf8',
    }).trim();
  } catch {
    return undefined;
  }
}

/**
 * Reads commit messages from the requested git range.
 *
 * @param before Previous commit SHA from the push event.
 * @param after Current commit SHA from the push event.
 * @param latestTag Latest release tag used as a fallback range start.
 * @returns Commit messages in the selected range.
 */
function getCommitMessages(
  before: string | undefined,
  after: string,
  latestTag: string | undefined,
): string[] {
  const rangeStart = before && !zeroSha.test(before) ? before : latestTag;
  const range = rangeStart ? `${rangeStart}..${after}` : after;
  const output = execFileSync(
    'git',
    ['log', '--format=%B' + commitSeparator, range],
    {
      encoding: 'utf8',
    },
  ).trim();

  return output
    .split(commitSeparator)
    .map((message) => message.trim())
    .filter(Boolean);
}

/**
 * Checks whether a commit message carries a semantic breaking-change marker.
 *
 * @param message Commit message to inspect.
 * @returns True when the message marks a breaking change.
 */
function hasBreakingChange(message: string): boolean {
  return (
    /^[a-z]+(?:\([^)]+\))?!:/m.test(message) ||
    /^BREAKING(?: CHANGE| CHANGES)?:/m.test(message)
  );
}

const [before, after = 'HEAD'] = process.argv.slice(2);
const latestTag = getLatestTag();
const currentVersion = await getCurrentPackageVersion();
const baseVersion = latestTag ? parseVersion(latestTag) : currentVersion;
const releaseType = getReleaseType(getCommitMessages(before, after, latestTag));

if (!releaseType) {
  console.log('No semantic version change detected.');
  process.exitCode = 0;
} else {
  const targetVersion = incrementVersion(baseVersion, releaseType);

  if (compareVersions(currentVersion, targetVersion) >= 0) {
    console.log(
      `Package version ${formatVersion(currentVersion)} is already at or ahead of ${formatVersion(targetVersion)}.`,
    );
  } else {
    await updatePackageMetadata(formatVersion(targetVersion));
    console.log(`Updated package metadata to ${formatVersion(targetVersion)}.`);
  }
}
