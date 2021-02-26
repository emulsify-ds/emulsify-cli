import clone, { GitCloneOptions } from 'git-clone';

/**
 * Helper method that allows for git-clone to be used via async/await
 * instead of with callbacks.
 *
 * @param repository git repository that should be cloned.
 * @param targetPath path (absolute or relative) to where the repository should be cloned.
 * @param options options containing configuration for the git binary, shallow, and checkout.
 * @param options.git optional path to the git binary that should be used to clone.
 * @param options.checkout commit, branch, or tag that should be checked out after clone.
 * @param options.shallow indicates whether or not the clone should be shallow.
 */
export default async function cloneRepository(
  repository: string,
  targetPath: string,
  options: GitCloneOptions | void
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    clone(repository, targetPath, options, (e) => {
      if (e) {
        reject(e);
      } else {
        resolve();
      }
    });
  });
}
