import getAvailableStarters from './getAvailableStarters';

describe('getAvailableStarters', () => {
  it('can return a list of Emulsify starters', () => {
    expect.assertions(1);

    const expected = [
      {
        checkout: 'master',
        platform: 'drupal',
        platformMajorVersion: 9,
        repository: 'https://github.com/emulsify-ds/emulsify-drupal.git',
      },
    ];

    expect(getAvailableStarters()).toEqual(expected);
  });
});
