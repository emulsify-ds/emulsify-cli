import getAvailableSystems from './getAvailableSystems.js';

describe('getAvailableSystems', () => {
  it('returns the available systems', async () => {
    expect.assertions(1);
    await expect(getAvailableSystems()).resolves.toEqual([
      {
        name: 'compound',
        repository: 'https://github.com/emulsify-ds/compound.git',
        platforms: ['none', 'drupal', 'wordpress'],
      },
      {
        name: 'emulsify-ui-kit',
        repository: 'https://github.com/emulsify-ds/emulsify-ui-kit.git',
        platforms: ['none', 'drupal', 'wordpress'],
      },
    ]);
  });

  it('returns unique system names', async () => {
    expect.assertions(2);
    const systems = await getAvailableSystems();
    const systemNames = systems.map(({ name }) => name);

    expect(systemNames).toEqual(['compound', 'emulsify-ui-kit']);
    expect(new Set(systemNames).size).toBe(systemNames.length);
  });
});
