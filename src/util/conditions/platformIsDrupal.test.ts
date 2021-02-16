jest.mock('../findFileInCurrentPath', () => jest.fn());

import fs from 'fs';
import findFileInCurrentPath from '../findFileInCurrentPath';
import platformIsDrupal from './platformIsDrupal';

const readFileSync = jest.spyOn(fs, 'readFileSync');
(readFileSync as jest.Mock).mockReturnValue(
  JSON.stringify({
    extras: {
      'installer-paths': {
        core: ['type:drupal-core'],
      },
    },
  })
);
(findFileInCurrentPath as jest.Mock).mockReturnValue(
  '/home/uname/Projects/cornflake/composer.json'
);

describe('platformIsDrupal', () => {
  it('returns true if a composer.json file is found, and contains drupal-core within its extras object', () => {
    expect.assertions(1);
    expect(platformIsDrupal()).toBeTruthy();
  });

  it('returns false if the composer.json file does not contain the expected values', () => {
    expect.assertions(1);
    (readFileSync as jest.Mock).mockReturnValueOnce('{}');
    expect(platformIsDrupal()).toBeFalsy();
  });

  it('returns false if the file does not contain valid JSON (without throwing)', () => {
    expect.assertions(1);
    (readFileSync as jest.Mock).mockReturnValueOnce('not-valid-json');
    expect(platformIsDrupal()).toBeFalsy();
  });

  it('returns false if the composer.json file that was found cannot be read (without throwing)', () => {
    expect.assertions(1);
    (readFileSync as jest.Mock).mockImplementationOnce(() => {
      throw new Error(
        'Big oof, the composer.json file that was found cannot be loaded.'
      );
    });

    expect(platformIsDrupal()).toBeFalsy();
  });

  it('returns false if no composer.json file is found', () => {
    expect.assertions(1);
    (findFileInCurrentPath as jest.Mock).mockReturnValueOnce(undefined);
    expect(platformIsDrupal()).toBeFalsy();
  });
});
