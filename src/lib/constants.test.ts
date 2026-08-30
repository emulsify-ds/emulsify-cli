import {
  UTIL_DIR,
  CACHE_DIR,
  EMULSIFY_PROJECT_CONFIG_FILE,
  EMULSIFY_PROJECT_TEMPLATES_FOLDER,
  EMULSIFY_CACHE_METADATA_FILE,
} from './constants.js';
import { join } from 'path';

jest.mock('os', () => {
  const { join } = jest.requireActual<typeof import('path')>('path');
  return {
    homedir: () => join(process.cwd(), 'fixtures', 'home'),
  };
});

const mockHome = join(process.cwd(), 'fixtures', 'home');

const map = [
  ['UTIL_DIR', UTIL_DIR, join(mockHome, '.emulsify')],
  ['CACHE_DIR', CACHE_DIR, join(mockHome, '.emulsify', 'cache')],
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
