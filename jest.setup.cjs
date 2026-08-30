jest.mock('simple-git', () => {
  const mockGit = {
    clone: jest.fn(),
    branch: jest.fn(),
    getRemotes: jest.fn(),
    listRemote: jest.fn(),
    env: jest.fn().mockReturnThis(),
    revparse: jest.fn(),
    checkout: jest.fn(),
    fetch: jest.fn().mockReturnThis(),
    pull: jest.fn(),
    init: jest.fn().mockReturnThis(),
    addRemote: jest.fn().mockReturnThis(),
    tags: jest.fn(() => {
      return { latest: '' };
    }),
  };

  const simpleGit = jest.fn(() => mockGit);

  return {
    __esModule: true,
    default: simpleGit,
    simpleGit,
  };
});

jest.mock('fs', () => ({
  constants: jest.requireActual('fs').constants,
  existsSync: jest.fn(),
  writeFileSync: jest.fn(),
  promises: {
    writeFile: jest.fn(),
    readFile: jest.fn(),
    readdir: jest.fn(),
    rm: jest.fn(),
    mkdir: jest.fn(),
    mkdtemp: jest.fn(),
    link: jest.fn(),
    open: jest.fn(),
    rename: jest.fn(),
    stat: jest.fn(),
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
