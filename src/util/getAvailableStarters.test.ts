import getAvailableStarters from './getAvailableStarters.js';

describe('getAvailableStarters', () => {
  it('can return a list of Emulsify starters', () => {
    expect.assertions(1);

    const expected = [
      {
        platform: 'none',
        platformMajorVersion: 1,
        repository: 'https://github.com/emulsify-ds/emulsify-starter',
        checkout: 'develop',
      },
    ];

    expect(getAvailableStarters()).toEqual(expected);
  });
});
