import { EXIT_ERROR } from './constants';

const map = [['EXIT_ERROR', EXIT_ERROR, 1]];

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
