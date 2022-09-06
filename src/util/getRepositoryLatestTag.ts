import simpleGit from 'simple-git';

const git = simpleGit();

/**
 * Helper function to get the latest tag for a given repository url.
 *
 * @param url git url to use
 * @returns string of the latest tag or undefined.
 */
export default async function getRepositoryLatestTag(
  url: string
): Promise<string | undefined> {
  const repositoryTags = await git
    .init()
    .addRemote('origin', url)
    .fetch()
    .tags();
  return repositoryTags.latest;
}
