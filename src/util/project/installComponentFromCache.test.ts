jest.mock('../cache/copyItemFromCache', () => jest.fn());
jest.mock('../fs/findFileInCurrentPath', () => jest.fn());

import type { EmulsifySystem, EmulsifyVariant } from '@emulsify-cli/config';
import copyItemFromCache from '../cache/copyItemFromCache';
import findFileInCurrentPath from '../fs/findFileInCurrentPath';
import installComponentFromCache from './installComponentFromCache';

const findFileMock = (findFileInCurrentPath as jest.Mock).mockReturnValue(
  '/home/uname/Projects/cornflake/web/themes/custom/cornflake/project.emulsify.json'
);

describe('installComponentFromCache', () => {
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
      installComponentFromCache(system, variant, 'link')
    ).rejects.toThrow(
      'Unable to find an Emulsify project to install the component into.'
    );
  });

  it('throws an error if the specified component does not exist within the given variant', async () => {
    expect.assertions(1);
    await expect(
      installComponentFromCache(system, variant, 'card')
    ).rejects.toThrow(
      'The specified component (card) does not exist within the given system variant.'
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
        'link'
      )
    ).rejects.toThrow(
      'The structure (cornpop) specified within the component link is invalid.'
    );
  });

  it('copies the component from the cached item into the correct destination', async () => {
    expect.assertions(1);
    await installComponentFromCache(system, variant, 'link');
    expect(copyItemFromCache as jest.Mock).toHaveBeenCalledWith(
      'systems',
      ['compound', './components/00-base', 'link'],
      '/home/uname/Projects/cornflake/web/themes/custom/cornflake/components/00-base/link'
    );
  });
});
