jest.mock('../lib/log', () => jest.fn());

import log from '../lib/log';
import init from './init';

describe('init', () => {
  it('logs to the console', () => {
    init('test', './themes/cornflake');
    expect(log).toHaveBeenCalledWith(
      'error',
      'Initializing test Emulsify project in ./themes/cornflake'
    );
  });
});
