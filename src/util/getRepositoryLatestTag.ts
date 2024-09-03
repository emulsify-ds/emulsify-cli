import simpleGit from 'simple-git';

const getRepositoryLatestTag = async (repoUrl: string): Promise<string> => {
  const git = simpleGit();
  try {
    await git.init();
    await git.addRemote('origin', repoUrl);
    await git.fetch();
    const tags = await git.tags();
    return tags.latest || '';
  } catch (error) {
    throw error;
  }
};

export default getRepositoryLatestTag;
