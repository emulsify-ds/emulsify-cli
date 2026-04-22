jest.mock('simple-git', () => {
  const mockGit = {
    clone: jest.fn(),
    branch: jest.fn(),
    checkout: jest.fn(),
    fetch: jest.fn().mockReturnThis(),
    pull: jest.fn(),
    init: jest.fn().mockReturnThis(),
    addRemote: jest.fn().mockReturnThis(),
    tags: jest.fn(() => {
      return { latest: '' };
    }),
  };

  return jest.fn(() => mockGit);
});

jest.mock('fs', () => ({
  existsSync: jest.fn(),
  writeFileSync: jest.fn(),
  promises: {
    writeFile: jest.fn(),
    readFile: jest.fn(),
    rm: jest.fn(),
    mkdir: jest.fn(),
    copyFile: jest.fn(),
  },
}));

jest.mock('fs-extra', () => ({
  copy: jest.fn(),
  remove: jest.fn(),
  pathExists: jest.fn(),
}));

jest.mock('child_process');
jest.mock('progress');
