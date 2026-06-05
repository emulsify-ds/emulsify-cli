import R from 'ramda';
import consolaGlobalInstance from 'consola';

const consolaLogMock = jest
  .spyOn(consolaGlobalInstance, 'log')
  .mockImplementation(R.identity);
const consolaInfoMock = jest
  .spyOn(consolaGlobalInstance, 'info')
  .mockImplementation(R.identity);
const consolaErrorMock = jest
  .spyOn(consolaGlobalInstance, 'error')
  .mockImplementation(R.identity);
const consolaWarnMock = jest
  .spyOn(consolaGlobalInstance, 'warn')
  .mockImplementation(R.identity);
const exitMock = jest
  .spyOn(global.process, 'exit')
  .mockImplementation(R.identity as () => never);

import log from './log.js';

describe('log', () => {
  it('can log info messages', () => {
    expect.assertions(1);
    log('info', 'information');
    expect(consolaInfoMock).toHaveBeenCalledTimes(1);
  });

  it('can log error messages', () => {
    expect.assertions(1);
    log('error', 'error message');
    expect(consolaErrorMock).toHaveBeenCalledTimes(1);
  });

  it('can log warning messages', () => {
    expect.assertions(1);
    log('warn', 'warn message');
    expect(consolaWarnMock).toHaveBeenCalledTimes(1);
  });

  it('can write other types of messages', () => {
    expect.assertions(1);
    log('success', 'success message');
    expect(consolaLogMock).toHaveBeenCalledTimes(1);
  });

  it('exits with the given code if one is provided', () => {
    log('error', 'big oof', 1);
    expect(exitMock).toHaveBeenCalledTimes(1);
  });

  it('can log debug messages', () => {
    log('debug', 'debug message');
    expect(consolaLogMock).toHaveBeenCalled();
  });

  it('can log verbose messages', () => {
    log('verbose', 'verbose message');
    expect(consolaLogMock).toHaveBeenCalled();
  });
});
