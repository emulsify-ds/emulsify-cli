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

// @clack/prompts ships ESM only and draws to a real terminal, so it is mocked
// globally. Suites that assert on a specific prompt override this with their
// own factory; the defaults here simply keep every other suite loadable.
jest.mock('@clack/prompts', () => {
  const CANCEL_SYMBOL = Symbol.for('clack:cancel');

  return {
    __esModule: true,
    CANCEL_SYMBOL,
    isCancel: (value) => value === CANCEL_SYMBOL,
    intro: jest.fn(),
    outro: jest.fn(),
    cancel: jest.fn(),
    note: jest.fn(),
    box: jest.fn(),
    text: jest.fn(),
    select: jest.fn(),
    confirm: jest.fn(),
    multiselect: jest.fn(),
    spinner: jest.fn(() => ({
      start: jest.fn(),
      stop: jest.fn(),
      message: jest.fn(),
      cancel: jest.fn(),
      error: jest.fn(),
      clear: jest.fn(),
      isCancelled: false,
    })),
    log: {
      message: jest.fn(),
      info: jest.fn(),
      success: jest.fn(),
      step: jest.fn(),
      warn: jest.fn(),
      warning: jest.fn(),
      error: jest.fn(),
    },
  };
});
