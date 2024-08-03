import R from 'ramda';
import consolaGlobalInstance from 'consola';

jest.spyOn(consolaGlobalInstance, 'log').mockImplementation(R.identity);
jest.spyOn(consolaGlobalInstance, 'info').mockImplementation(R.identity);
jest.spyOn(consolaGlobalInstance, 'error').mockImplementation(R.identity);
jest.spyOn(consolaGlobalInstance, 'warn').mockImplementation(R.identity);
jest
  .spyOn(global.process, 'exit')
  .mockImplementation(R.identity as () => never);

import log from './log.js';

describe('log', () => {
  it('can log info messages', () => {
    expect.assertions(1);
    log('info', 'information');
    expect(consolaGlobalInstance.info as jest.Mock).toHaveBeenCalledTimes(1);
  });

  it('can log error messages', () => {
    expect.assertions(1);
    log('error', 'error message');
    expect(consolaGlobalInstance.error as jest.Mock).toHaveBeenCalledTimes(1);
  });

  it('can log warning messages', () => {
    expect.assertions(1);
    log('warn', 'warn message');
    expect(consolaGlobalInstance.warn as jest.Mock).toHaveBeenCalledTimes(1);
  });

  it('can write other types of messages', () => {
    expect.assertions(1);
    log('success', 'success message');
    expect(consolaGlobalInstance.log as jest.Mock).toHaveBeenCalledTimes(1);
  });

  it('exits with the given code if one is provided', () => {
    log('error', 'big oof', 1);
    expect(global.process.exit as unknown as jest.Mock).toHaveBeenCalledTimes(
      1,
    );
  });
});
