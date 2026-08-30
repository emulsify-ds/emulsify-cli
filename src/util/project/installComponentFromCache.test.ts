jest.mock('../cache/copyItemFromCache', () => jest.fn());
jest.mock('../fs/findFileInCurrentPath', () => jest.fn());

import { pathExists } from 'fs-extra';
import { join, resolve } from 'path';
import type { EmulsifySystem, EmulsifyVariant } from '@emulsify-cli/config';
import { EMULSIFY_PROJECT_CONFIG_FILE } from '../../lib/constants.js';
import copyItemFromCache from '../cache/copyItemFromCache.js';
import findFileInCurrentPath from '../fs/findFileInCurrentPath.js';
import installComponentFromCache from './installComponentFromCache.js';

const projectRoot = resolve(
  '/home/username/Projects/drupal-project/web/themes/custom/themename',
);
const projectConfigPath = join(projectRoot, EMULSIFY_PROJECT_CONFIG_FILE);
const componentDestination = join(projectRoot, 'components', '00-base', 'link');
const findFileMock = (findFileInCurrentPath as jest.Mock).mockReturnValue(
  projectConfigPath,
);
const pathExistsMock = (pathExists as jest.Mock).mockResolvedValue(false);
const copyItemMock = copyItemFromCache as jest.Mock;

describe('installComponentFromCache', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    findFileMock.mockReturnValue(projectConfigPath);
    pathExistsMock.mockResolvedValue(false);
  });

  const system = {
    name: 'compound',
  } as EmulsifySystem;
  const variant = {
    structureImplementations: [
      {
        name: 'base',
        directory: './components/00-base',
      },
    ],
    components: [
      {
        name: 'link',
        structure: 'base',
      },
    ],
  } as EmulsifyVariant;

  it('throws an error if the user is not within an Emulsify project', async () => {
    expect.assertions(1);
    findFileMock.mockReturnValueOnce(undefined);
    await expect(
      installComponentFromCache(system, variant, 'link'),
    ).rejects.toThrow(
      'Unable to find an Emulsify project to install the component into.',
    );
  });

  it('throws an error if the specified component does not exist within the given variant', async () => {
    expect.assertions(1);
    await expect(
      installComponentFromCache(system, variant, 'card'),
    ).rejects.toThrow(
      'The specified component (card) does not exist within the given system variant.',
    );
  });

  it('throws an error if the component structure is invalid', async () => {
    expect.assertions(1);
    await expect(
      installComponentFromCache(
        system,
        {
          ...variant,
          components: [
            {
              name: 'link',
              structure: 'cornpop',
            },
          ],
        } as EmulsifyVariant,
        'link',
      ),
    ).rejects.toThrow(
      'The structure (cornpop) specified within the component link is invalid.',
    );
  });

  it('rejects unsafe component destinations before checking or copying files', async () => {
    expect.assertions(3);

    await expect(
      installComponentFromCache(
        system,
        {
          ...variant,
          structureImplementations: [
            {
              name: 'base',
              directory: '../../outside',
            },
          ],
        } as EmulsifyVariant,
        'link',
        true,
      ),
    ).rejects.toThrow(
      `Component destination "../../outside/link" resolves to "${resolve(projectRoot, '../../outside/link')}", which is outside the expected root "${projectRoot}".`,
    );

    expect(pathExistsMock).not.toHaveBeenCalled();
    expect(copyItemMock).not.toHaveBeenCalled();
  });

  it('throws an error if the component is already installed, and force is false', async () => {
    expect.assertions(1);
    pathExistsMock.mockResolvedValueOnce(true);
    await expect(
      installComponentFromCache(system, variant, 'link', false),
    ).rejects.toThrow(
      'The component "link" already exists, and force was not passed (--force).',
    );
  });

  it('copies the component from the cached item into the correct destination', async () => {
    expect.assertions(1);
    await installComponentFromCache(system, variant, 'link');
    expect(copyItemMock).toHaveBeenCalledWith(
      'systems',
      ['compound', './components/00-base', 'link'],
      componentDestination,
      false,
    );
  });
});
