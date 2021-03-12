import R from 'ramda';

/**
 * Helper function that takes a .git url (ssh or https) and returns the name
 * of the repository contained within the url.
 *
 * @param url git url from which a repo name should be extracted.
 *
 * @returns string repo name, or undefined if one cannot be parsed.
 */
export default function getGitRepoNameFromUrl(url: string): string | void {
  const parts = url.split('/');
  const gitName = R.last(parts) as string;

  // If no .git extension is provided, then this is an invalid git url.
  if (!gitName.includes('.git')) {
    return undefined;
  }
  return R.head(gitName.split('.'));
}
