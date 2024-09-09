import getAvailableStarters from './getAvailableStarters.js';

describe('getAvailableStarters', () => {
  it('can return a list of Emulsify starters', () => {
    expect.assertions(1);

    const expected = [
      {
        platform: 'none',
        platformMajorVersion: 1,
        repository: 'https://github.com/emulsify-ds/emulsify-starter',
        checkout: 'main',
      },
      {
        platform: 'drupal',
        platformMajorVersion: 11,
        repository: 'https://github.com/emulsify-ds/emulsify-drupal-starter',
        checkout: 'main',
      },
    ];

    expect(getAvailableStarters()).toEqual(expected);
  });
});
