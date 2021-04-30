jest.mock('../../lib/constants', () => ({
  CACHE_DIR: 'home/uname/.emulsify/cache',
}));
jest.mock('../fs/findFileInCurrentPath', () => jest.fn());

import findFileInCurrentPath from '../fs/findFileInCurrentPath';
import getCachedItemPath from './getCachedItemPath';

(findFileInCurrentPath as jest.Mock).mockReturnValue(
  '/home/uname/projects/emulsify'
);

describe('getCachedItemPath', () => {
  it('can produce the path to a cached file if given a cache bucket, cache item name, and filename', () => {
    expect.assertions(2);
    expect(
      getCachedItemPath('systems', ['compound', 'system.emulsify.json'])
    ).toBe(
      'home/uname/.emulsify/cache/systems/f556ea98d7e82a3bb86892c77634c0b3/compound/system.emulsify.json'
    );
    expect(
      getCachedItemPath('variants', [
        'compound',
        'drupal',
        'variant.emulsify.json',
      ])
    ).toBe(
      'home/uname/.emulsify/cache/variants/f556ea98d7e82a3bb86892c77634c0b3/compound/drupal/variant.emulsify.json'
    );
  });
});
