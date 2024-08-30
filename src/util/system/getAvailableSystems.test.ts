import getAvailableSystems from './getAvailableSystems';

describe('getAvailableSystems', () => {
  it('returns the available systems', async () => {
    expect.assertions(1);
    await expect(getAvailableSystems()).resolves.toEqual([
      {
        name: 'compound',
        repository: 'https://github.com/emulsify-ds/compound.git',
        platforms: ['drupal'],
      },
      {
        name: 'emulsify-ui-kit',
        repository: 'https://github.com/emulsify-ds/emulsify-ui-kit.git',
        platforms: ['drupal'],
      },
    ]);
  });
});
