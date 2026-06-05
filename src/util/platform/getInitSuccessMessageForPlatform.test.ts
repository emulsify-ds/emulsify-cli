import getInitSuccessMessageForPlatform from './getInitSuccessMessageForPlatform.js';

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
