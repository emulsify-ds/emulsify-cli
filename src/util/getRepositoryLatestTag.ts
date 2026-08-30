import { execFile } from 'child_process';
import getNonInteractiveGitEnvironment from './getNonInteractiveGitEnvironment.js';

type ParsedTag = {
  tag: string;
  major: number;
  minor: number;
  patch: number;
  prerelease?: string;
};

const tagPattern =
  /^v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/;

const REMOTE_TAG_LOOKUP_TIMEOUT_MS = 10_000;

class RemoteTagLookupTimeoutError extends Error {}

function getRemoteTagRefs(repoUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(
      'git',
      ['ls-remote', '--tags', '--refs', '--', repoUrl],
      {
        encoding: 'utf8',
        timeout: REMOTE_TAG_LOOKUP_TIMEOUT_MS,
        env: getNonInteractiveGitEnvironment(),
      },
      (error, stdout, stderr) => {
        if (error) {
          if (error.killed && error.signal === 'SIGTERM') {
            reject(
              new RemoteTagLookupTimeoutError(
                `The lookup timed out after ${REMOTE_TAG_LOOKUP_TIMEOUT_MS / 1_000} seconds.`,
              ),
            );
            return;
          }

          reject(new Error(stderr.trim() || error.message));
          return;
        }

        resolve(stdout);
      },
    );
  });
}

function parseTagRef(line: string): ParsedTag | undefined {
  const [, ref] = line.trim().split(/\s+/);
  const tagRefPrefix = 'refs/tags/';
  if (!ref?.startsWith(tagRefPrefix)) {
    return;
  }

  const tag = ref.slice(tagRefPrefix.length);
  const tagParts = tag.match(tagPattern);
  if (!tagParts) {
    return;
  }

  const [, major, minor, patch, prerelease] = tagParts;
  return {
    tag,
    major: Number(major),
    minor: Number(minor),
    patch: Number(patch),
    prerelease,
  };
}

function comparePrerelease(left?: string, right?: string): number {
  if (!left && !right) {
    return 0;
  }
  if (!left) {
    return 1;
  }
  if (!right) {
    return -1;
  }

  const leftParts = left.split('.');
  const rightParts = right.split('.');
  const length = Math.max(leftParts.length, rightParts.length);

  for (let i = 0; i < length; i += 1) {
    const leftPart = leftParts[i];
    const rightPart = rightParts[i];

    if (leftPart === undefined) {
      return -1;
    }
    if (rightPart === undefined) {
      return 1;
    }

    const leftIsNumber = /^\d+$/.test(leftPart);
    const rightIsNumber = /^\d+$/.test(rightPart);

    if (leftIsNumber && rightIsNumber) {
      const numberComparison = Number(leftPart) - Number(rightPart);
      if (numberComparison !== 0) {
        return numberComparison;
      }
      continue;
    }

    if (leftIsNumber) {
      return -1;
    }
    if (rightIsNumber) {
      return 1;
    }

    const stringComparison = leftPart.localeCompare(rightPart);
    if (stringComparison !== 0) {
      return stringComparison;
    }
  }

  return 0;
}

function compareTags(left: ParsedTag, right: ParsedTag): number {
  const versionComparison =
    left.major - right.major ||
    left.minor - right.minor ||
    left.patch - right.patch;

  return (
    versionComparison || comparePrerelease(left.prerelease, right.prerelease)
  );
}

const getRepositoryLatestTag = async (repoUrl: string): Promise<string> => {
  let refs: string;
  try {
    refs = await getRemoteTagRefs(repoUrl);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const checkoutSuggestion =
      error instanceof RemoteTagLookupTimeoutError
        ? ` Retry with --repository "${repoUrl}" --checkout <branch, tag, or commit> to skip automatic tag lookup.`
        : '';
    throw new Error(
      `Unable to read tags from repository ${repoUrl}: ${message}${checkoutSuggestion}`,
    );
  }

  const usableTags = refs
    .split('\n')
    .map(parseTagRef)
    .filter((tag): tag is ParsedTag => Boolean(tag));

  if (usableTags.length === 0) {
    throw new Error(
      `No usable SemVer tags were found in repository ${repoUrl}.`,
    );
  }

  const latest = usableTags.reduce((currentLatest, tag) =>
    compareTags(tag, currentLatest) > 0 ? tag : currentLatest,
  );

  return latest.tag;
};

export default getRepositoryLatestTag;
