import {
  EXIT_ERROR,
  UTIL_DIR,
  SYSTEMS_DIR,
  TMP_DIR,
  EMULSIFY_PROJECT_CONFIG_FILE,
} from './constants';

jest.mock('os', () => ({
  homedir: () => '/home/username',
}));

const map = [
  ['EXIT_ERROR', EXIT_ERROR, 1],
  ['UTIL_DIR', UTIL_DIR, '/home/username/.emulsify'],
  ['SYSTEMS_DIR', SYSTEMS_DIR, '/home/username/.emulsify/systems'],
  ['TMP_DIR', TMP_DIR, '/home/username/.emulsify/.tmp'],
  [
    'EMULSIFY_PROJECT_CONFIG_FILE',
    EMULSIFY_PROJECT_CONFIG_FILE,
    'emulsify.config.json',
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
    }
  );
});
