jest.mock('simple-git', () => {
  const mockGit = {
    clone: jest.fn(),
  };

  return jest.fn(() => mockGit);
});

jest.mock('fs', () => ({
  existsSync: jest.fn(),
  writeFileSync: jest.fn(),
  promises: {
    writeFile: jest.fn(),
    readFile: jest.fn(),
    rmdir: jest.fn(),
    mkdir: jest.fn(),
    copyFile: jest.fn(),
  },
}));

jest.mock('fs-extra', () => ({
  copy: jest.fn(),
}));
