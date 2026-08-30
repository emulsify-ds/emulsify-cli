jest.mock('./getCachedItemPath', () =>
  jest.fn(
    () =>
      '/home/uname/.emulsify/cache/systems/12345/compound/components/00-base/colors',
  ),
);
import { copy, remove } from 'fs-extra';
import getEmulsifyConfig from '../project/getEmulsifyConfig.js';
import getCachedItemPath from './getCachedItemPath.js';
import copyItemFromCache from './copyItemFromCache.js';

// Mock the getEmulsifyConfig function
jest.mock('../project/getEmulsifyConfig', () => jest.fn());

describe('copyItemFromCache', () => {
  const mockConfig = {
    system: {
      repository: 'https://github.com/emulsify-ds/compound.git',
      checkout: 'checkoutBranch',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getEmulsifyConfig as jest.Mock).mockResolvedValue(mockConfig); // Ensure proper casting
  });

  it('can copy an item from cache to the given destination', async () => {
    await copyItemFromCache(
      'systems',
      ['compound', 'components', '00-base', 'colors'],
      '/home/uname/Projects/drupal/web/themes/custom/cornflake/components/00-base/colors',
    );
    expect(copy).toHaveBeenCalledWith(
      '/home/uname/.emulsify/cache/systems/12345/compound/components/00-base/colors',
      '/home/uname/Projects/drupal/web/themes/custom/cornflake/components/00-base/colors',
    );
    expect(getCachedItemPath).toHaveBeenCalledWith({
      bucket: 'systems',
      itemPath: ['compound', 'components', '00-base', 'colors'],
      repository: 'https://github.com/emulsify-ds/compound.git',
      checkout: 'checkoutBranch',
    });
  });

  it('can remove a destination before copying items from the cache if "force" is true', async () => {
    await copyItemFromCache(
      'systems',
      ['compound', 'components', '00-base', 'colors'],
      '/home/uname/Projects/drupal/web/themes/custom/cornflake/components/00-base/colors',
      true,
    );
    expect(remove).toHaveBeenCalledWith(
      '/home/uname/Projects/drupal/web/themes/custom/cornflake/components/00-base/colors',
    );
  });

  it('should handle missing emulsifyConfig system checkout', async () => {
    (getEmulsifyConfig as jest.Mock).mockResolvedValue({
      system: {
        repository: 'https://github.com/emulsify-ds/compound.git',
      },
    });

    await copyItemFromCache(
      'systems',
      ['compound', 'components', '00-base', 'colors'],
      '/home/uname/Projects/drupal/web/themes/custom/cornflake/components/00-base/colors',
    );

    expect(copy).toHaveBeenCalledWith(
      '/home/uname/.emulsify/cache/systems/12345/compound/components/00-base/colors',
      '/home/uname/Projects/drupal/web/themes/custom/cornflake/components/00-base/colors',
    );
    expect(getCachedItemPath).toHaveBeenCalledWith(
      expect.objectContaining({
        repository: 'https://github.com/emulsify-ds/compound.git',
        checkout: '',
      }),
    );
  });

  it('should handle undefined emulsifyConfig', async () => {
    (getEmulsifyConfig as jest.Mock).mockResolvedValue(undefined);

    await copyItemFromCache(
      'systems',
      ['compound', 'components', '00-base', 'colors'],
      '/home/uname/Projects/drupal/web/themes/custom/cornflake/components/00-base/colors',
    );

    expect(copy).toHaveBeenCalledWith(
      '/home/uname/.emulsify/cache/systems/12345/compound/components/00-base/colors',
      '/home/uname/Projects/drupal/web/themes/custom/cornflake/components/00-base/colors',
    );
    expect(getCachedItemPath).toHaveBeenCalledWith(
      expect.objectContaining({ repository: '', checkout: '' }),
    );
  });
});
