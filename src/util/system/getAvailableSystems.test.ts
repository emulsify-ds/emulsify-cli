import getAvailableSystems from './getAvailableSystems.js';

describe('getAvailableSystems', () => {
  it('returns the available systems', async () => {
    expect.assertions(1);
    await expect(getAvailableSystems()).resolves.toEqual([
      {
        name: 'compound',
        repository: 'https://github.com/emulsify-ds/compound.git',
        platforms: ['drupal'],
      },
    ]);
  });
});
