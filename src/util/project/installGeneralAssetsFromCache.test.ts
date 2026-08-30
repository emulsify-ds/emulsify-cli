jest.mock('../cache/copyItemFromCache', () => jest.fn());
jest.mock('../fs/findFileInCurrentPath', () => jest.fn());

import type { EmulsifySystem, EmulsifyVariant } from '@emulsify-cli/config';
import { join, resolve } from 'path';
import { EMULSIFY_PROJECT_CONFIG_FILE } from '../../lib/constants.js';
import copyItemFromCache from '../cache/copyItemFromCache.js';
import findFileInCurrentPath from '../fs/findFileInCurrentPath.js';
import installGeneralAssetsFromCache from './installGeneralAssetsFromCache.js';

const projectRoot = resolve(
  '/home/username/Projects/drupal-project/web/themes/custom/themename',
);
const projectConfigPath = join(projectRoot, EMULSIFY_PROJECT_CONFIG_FILE);
const findFileMock = (findFileInCurrentPath as jest.Mock).mockReturnValue(
  projectConfigPath,
);
const copyItemMock = (copyItemFromCache as jest.Mock).mockResolvedValue(true);

describe('installGeneralAssetsFromCache', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    findFileMock.mockReturnValue(projectConfigPath);
    copyItemMock.mockResolvedValue(true);
  });

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
      installGeneralAssetsFromCache(system, variant),
    ).rejects.toThrow(
      'Unable to find an Emulsify project to install assets into.',
    );
  });

  it('rejects unsafe general asset destination paths before copying files', async () => {
    expect.assertions(2);

    await expect(
      installGeneralAssetsFromCache(system, {
        directories: [
          {
            name: 'unsafe',
            path: './components/unsafe',
            destinationPath: '../../outside',
          },
        ],
      } as EmulsifyVariant),
    ).rejects.toThrow(
      `General asset destination "../../outside" resolves to "${resolve(projectRoot, '../../outside')}", which is outside the expected root "${projectRoot}".`,
    );

    expect(copyItemMock).not.toHaveBeenCalled();
  });

  it('copies all general files and directories into the Emulsify project', async () => {
    expect.assertions(2);
    await installGeneralAssetsFromCache(system, variant);
    expect(copyItemMock).toHaveBeenNthCalledWith(
      1,
      'systems',
      ['compound', './components/00-base/00-defaults'],
      join(projectRoot, 'components', '00-base', '00-defaults'),
      true,
    );
    expect(copyItemMock).toHaveBeenNthCalledWith(
      2,
      'systems',
      ['compound', './components/style.scss'],
      join(projectRoot, 'components', 'style.scss'),
      true,
    );
  });

  it('defaults directories/variants to empty arrays', async () => {
    expect.assertions(1);
    await installGeneralAssetsFromCache(system, {} as EmulsifyVariant);
    expect(copyItemMock).not.toHaveBeenCalled();
  });
});
