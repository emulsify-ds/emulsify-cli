import { existsSync } from 'fs';
import { basename, isAbsolute, resolve, win32 } from 'path';

const fileUriPattern = /^file:\/\//i;
const explicitRelativePathPattern = /^\.{1,2}(?:[\\/]|$)/;
const uriPattern = /^[a-z][a-z\d+.-]*:\/\//i;
const scpLikePattern = /^(?:[^@/\\\s]+@)?[^:/\\\s]+:.+/;

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

  return name.endsWith('.git') ? name.slice(0, -4) || undefined : name;
}

/**
 * Helper function that takes a Git URL or local repository path and returns
 * the repository name. Remote URLs must retain the existing `.git` suffix;
 * local paths and file URLs may omit it.
 *
 * @param url Git URL or local path from which a repo name should be extracted.
 *
 * @returns string repo name, or undefined if one cannot be parsed.
 */
export default function getGitRepoNameFromUrl(url: string): string | void {
  const repository = url.trim();
  if (!repository) {
    throw new Error('The repository URL must end in .git.');
  }

  if (isLocalRepository(repository)) {
    return getLocalRepositoryName(repository);
  }

  const parts = repository.split('/');
  const gitName = parts.at(-1) as string;

  // If no .git extension is provided, then this is an invalid git url.
  if (!gitName.endsWith('.git')) {
    throw new Error('The repository URL must end in .git.');
  }
  return gitName.slice(0, -4) || undefined;
}
