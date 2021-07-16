jest.mock('./getCachedItemPath', () =>
  jest.fn(
    () =>
      '/home/uname/.emulsify/cache/systems/12345/compound/components/00-base/colors'
  )
);
import { copy } from 'fs-extra';
import copyItemFromCache from './copyItemFromCache';

describe('copyItemFromCache', () => {
  it('can copy an item from cache to the given destination', async () => {
    await copyItemFromCache(
      'systems',
      ['compound', 'components', '00-base', 'colors'],
      '/home/uname/Projects/drupal/web/themes/custom/cornflake/components/00-base/colors'
    );
    expect(copy).toHaveBeenCalledWith(
      '/home/uname/.emulsify/cache/systems/12345/compound/components/00-base/colors',
      '/home/uname/Projects/drupal/web/themes/custom/cornflake/components/00-base/colors'
    );
  });
});
