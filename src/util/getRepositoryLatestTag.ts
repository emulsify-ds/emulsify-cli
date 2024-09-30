import simpleGit from 'simple-git';

const getRepositoryLatestTag = async (repoUrl: string): Promise<string> => {
  const git = simpleGit();
  try {
    await git.init();

    // If this gets run twice somehow, don't break, just try again.
    try {
      await git.removeRemote('origin');
    } catch (error) {
      // honestly no big deal if there is nothing to remove.
    }
    await git.addRemote('origin', repoUrl);
    await git.fetch();
    const tags = await git.tags();
    return tags.latest || '';
  } catch (error) {
    throw error;
  }
};

export default getRepositoryLatestTag;
