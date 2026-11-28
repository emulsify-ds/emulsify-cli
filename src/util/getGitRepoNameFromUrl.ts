import { existsSync } from 'fs';
import { basename, isAbsolute, resolve, win32 } from 'path';
import CliError from '../lib/CliError.js';

const fileUriPattern = /^file:\/\//i;
const explicitRelativePathPattern = /^\.{1,2}(?:[\\/]|$)/;
const uriPattern = /^[a-z][a-z\d+.-]*:\/\//i;
const scpLikePattern = /^(?:[^@/\\\s]+@)?[^:/\\\s]+:.+/;
const repositoryNamePattern = /^[A-Za-z0-9._-]+$/;

function isLocalRepository(repository: string): boolean {
  if (
    fileUriPattern.test(repository) ||
    isAbsolute(repository) ||
    win32.isAbsolute(repository) ||
    explicitRelativePathPattern.test(repository)
  ) {
    return true;
  }

  if (uriPattern.test(repository) || scpLikePattern.test(repository)) {
    return false;
  }

  return existsSync(repository);
}

function getLocalRepositoryName(repository: string): string | void {
  let name: string;

  if (fileUriPattern.test(repository)) {
    try {
      const pathname = decodeURIComponent(new URL(repository).pathname);
      name = basename(pathname.replace(/[\\/]+$/, ''));
    } catch {
      return;
    }
  } else if (win32.isAbsolute(repository) || repository.includes('\\')) {
    name = win32.basename(repository.replace(/[\\/]+$/, ''));
  } else {
    name = basename(resolve(repository));
  }

  return name;
}

/**
 * Helper function that takes a Git URL or local repository path and returns
 * the repository name. Remote URLs must retain the existing `.git` suffix;
 * local paths and file URLs may omit it.
 *
 * @param url Git URL or local path from which a repo name should be extracted.
 *
 * @returns string repo name, or undefined if a file URL cannot be parsed.
 */
export default function getGitRepoNameFromUrl(url: string): string | void {
  const repository = url.trim();
  let gitName: string | void;

  if (repository && isLocalRepository(repository)) {
    gitName = getLocalRepositoryName(repository);
    if (gitName === undefined) {
      return;
    }
  } else {
    const repositoryPath =
      !uriPattern.test(repository) && scpLikePattern.test(repository)
        ? repository.slice(repository.indexOf(':') + 1)
        : repository;
    gitName = repositoryPath.split('/').at(-1) ?? '';
    if (!gitName.endsWith('.git')) {
      throw new CliError(
        `The repository URL must end in .git. Received "${url}".`,
      );
    }
  }

  const name = gitName.endsWith('.git') ? gitName.slice(0, -4) : gitName;
  if (!repositoryNamePattern.test(name) || name === '.' || name === '..') {
    throw new CliError(`Invalid repository name in "${url}".`);
  }

  return name;
}
