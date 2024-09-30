import getInitSuccessMessageForPlatform from './getInitSuccessMessageForPlatform.js';

// The unsafe assignment rule is disabled for this file because
// it is important to use `expect.any`. There is no reason to test the
// content of those messages, and doing so is especially odd due to the
// character codes that come with chalk functions.
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
describe('getInitSuccessMessageForPlatform', () => {
  it('can return init success log messages for a given platform', () => {
    expect.assertions(1);
    expect(getInitSuccessMessageForPlatform('drupal', '/directory')).toEqual([
      {
        method: 'info',
        message: expect.any(String),
      },
      {
        method: 'verbose',
        message: expect.any(String),
      },
      {
        method: 'info',
        message: expect.any(String),
      },
      {
        method: 'verbose',
        message: expect.any(String),
      },
    ]);
  });

  it('returns an empty array if the given platform does not correspond with any success messages', () => {
    expect.assertions(1);
    expect(getInitSuccessMessageForPlatform('java', '/directory')).toEqual([]);
  });
});
