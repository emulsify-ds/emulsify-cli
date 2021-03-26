jest.mock('../cache/copyItemFromCache', () => jest.fn());
jest.mock('../fs/findFileInCurrentPath', () => jest.fn());

import type { EmulsifySystem, EmulsifyVariant } from '@emulsify-cli/config';
import copyItemFromCache from '../cache/copyItemFromCache';
import findFileInCurrentPath from '../fs/findFileInCurrentPath';
import installGeneralAssetsFromCache from './installGeneralAssetsFromCache';

const findFileMock = (findFileInCurrentPath as jest.Mock).mockReturnValue(
  '/home/uname/Projects/cornflake/web/themes/custom/cornflake/project.emulsify.json'
);
(copyItemFromCache as jest.Mock).mockResolvedValue(true);

describe('installGeneralAssetsFromCache', () => {
  const system = {
    name: 'compound',
  } as EmulsifySystem;
  const variant = {
    directories: [
      {
        name: 'defaults',
        path: './components/00-base/00-defaults',
        destinationPath: './components/00-base/00-defaults',
      },
    ],
    files: [
      {
        name: 'style',
        path: './components/style.scss',
        destinationPath: './components/style.scss',
      },
    ],
  } as EmulsifyVariant;

  it('throws an error if the user is not within an Emulsify project', async () => {
    expect.assertions(1);
    findFileMock.mockReturnValueOnce(undefined);
    await expect(
      installGeneralAssetsFromCache(system, variant)
    ).rejects.toThrow(
      'Unable to find an Emulsify project to install assets into.'
    );
  });

  it('copies all general files and directories into the Emulsify project', async () => {
    expect.assertions(2);
    await installGeneralAssetsFromCache(system, variant);
    expect(copyItemFromCache).toHaveBeenNthCalledWith(
      1,
      'systems',
      ['compound', './components/00-base/00-defaults'],
      '/home/uname/Projects/cornflake/web/themes/custom/cornflake/components/00-base/00-defaults'
    );
    expect(copyItemFromCache).toHaveBeenNthCalledWith(
      2,
      'systems',
      ['compound', './components/style.scss'],
      '/home/uname/Projects/cornflake/web/themes/custom/cornflake/components/style.scss'
    );
  });
});
