import getAvailableSystems from './getAvailableSystems';

describe('getAvailableSystems', () => {
  it('returns the available systems', async () => {
    expect.assertions(1);
    await expect(getAvailableSystems()).resolves.toEqual([
      {
        name: 'compound',
        repository: 'git@github.com:emulsify-ds/compound.git',
      },
    ]);
  });
});
