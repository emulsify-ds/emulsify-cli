jest.mock('../../lib/constants', () => ({
  CACHE_DIR: 'home/uname/.emulsify/cache',
}));
import getCachedItemPath from './getCachedItemPath';

describe('getCachedItemPath', () => {
  it('can produce the path to a cached file if given a cache bucket, cache item name, and filename', () => {
    expect.assertions(2);
    expect(
      getCachedItemPath('systems', ['compound'], 'system.emulsify.json')
    ).toBe('home/uname/.emulsify/cache/systems/compound/system.emulsify.json');
    expect(
      getCachedItemPath(
        'variants',
        ['compound', 'drupal'],
        'variant.emulsify.json'
      )
    ).toBe(
      'home/uname/.emulsify/cache/variants/compound/drupal/variant.emulsify.json'
    );
  });
});
