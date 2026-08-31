import consolaGlobalInstance from 'consola';

/**
 * Return the provided value unchanged.
 *
 * @param value value to return.
 *
 * @returns the provided value.
 */
const identity = <T>(value: T): T => value;

const consolaLogMock = jest
  .spyOn(consolaGlobalInstance, 'log')
  .mockImplementation(identity);
const consolaInfoMock = jest
  .spyOn(consolaGlobalInstance, 'info')
  .mockImplementation(identity);
const consolaErrorMock = jest
  .spyOn(consolaGlobalInstance, 'error')
  .mockImplementation(identity);
const consolaWarnMock = jest
  .spyOn(consolaGlobalInstance, 'warn')
  .mockImplementation(identity);
const exitMock = jest
  .spyOn(global.process, 'exit')
  .mockImplementation(identity as () => never);

import log from './log.js';

describe('log', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

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

  it('does not exit when logging', () => {
    exitMock.mockClear();
    log('error', 'big oof');
    expect(exitMock).not.toHaveBeenCalled();
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
