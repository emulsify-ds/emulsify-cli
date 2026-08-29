import {
  UTIL_DIR,
  CACHE_DIR,
  EMULSIFY_PROJECT_CONFIG_FILE,
  EMULSIFY_PROJECT_TEMPLATES_FOLDER,
  EMULSIFY_CACHE_METADATA_FILE,
} from './constants.js';

jest.mock('os', () => ({
  homedir: () => '/home/username',
}));

const map = [
  ['UTIL_DIR', UTIL_DIR, '/home/username/.emulsify'],
  ['CACHE_DIR', CACHE_DIR, '/home/username/.emulsify/cache'],
  [
    'EMULSIFY_PROJECT_CONFIG_FILE',
    EMULSIFY_PROJECT_CONFIG_FILE,
    'project.emulsify.json',
  ],
  [
    'EMULSIFY_PROJECT_TEMPLATES_FOLDER',
    EMULSIFY_PROJECT_TEMPLATES_FOLDER,
    '.cli/templates',
  ],
  [
    'EMULSIFY_CACHE_METADATA_FILE',
    EMULSIFY_CACHE_METADATA_FILE,
    '.emulsify-cache.json',
  ],
];

describe('constats', () => {
  describe.each(map)(
    'constant %s has the correct value',
    (name, value, expectation) => {
      it(`${name} = ${expectation}`, () => {
        expect.assertions(1);
        expect(value).toBe(expectation);
      });
    },
  );
});
