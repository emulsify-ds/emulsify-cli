import { log as render } from '@clack/prompts';

import log from './log.js';

const renderMock = render as jest.Mocked<typeof render>;

/**
 * Return the provided value unchanged.
 *
 * @param value value to return.
 *
 * @returns the provided value.
 */
const identity = <T>(value: T): T => value;

const exitMock = jest
  .spyOn(global.process, 'exit')
  .mockImplementation(identity as () => never);

const originalStdoutIsTTY = process.stdout.isTTY;

function setStdoutIsTTY(value: boolean | undefined): void {
  Object.defineProperty(process.stdout, 'isTTY', {
    value,
    configurable: true,
  });
}

describe('log', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setStdoutIsTTY(true);
  });

  afterAll(() => {
    setStdoutIsTTY(originalStdoutIsTTY);
  });

  it('can log info messages', () => {
    expect.assertions(1);
    log('info', 'information');
    expect(renderMock.info).toHaveBeenCalledTimes(1);
  });

  it('can log error messages', () => {
    expect.assertions(1);
    log('error', 'error message');
    expect(renderMock.error).toHaveBeenCalledTimes(1);
  });

  it('can log warning messages', () => {
    expect.assertions(1);
    log('warn', 'warn message');
    expect(renderMock.warn).toHaveBeenCalledTimes(1);
  });

  it('marks success messages with their own symbol', () => {
    expect.assertions(2);
    log('success', 'success message');
    expect(renderMock.success).toHaveBeenCalledTimes(1);
    expect(renderMock.message).not.toHaveBeenCalled();
  });

  it('does not exit when logging', () => {
    exitMock.mockClear();
    log('error', 'big oof');
    expect(exitMock).not.toHaveBeenCalled();
  });

  it('can log debug messages', () => {
    log('debug', 'debug message');
    expect(renderMock.message).toHaveBeenCalled();
  });

  it('can log verbose messages', () => {
    log('verbose', 'verbose message');
    expect(renderMock.message).toHaveBeenCalled();
  });

  it('writes diagnostics to stderr, not stdout', () => {
    expect.assertions(2);

    log('error', 'error message');
    log('warn', 'warn message');

    expect(renderMock.error).toHaveBeenCalledWith('error message', {
      output: expect.anything(),
    });
    expect(renderMock.warn).toHaveBeenCalledWith('warn message', {
      output: expect.anything(),
    });
  });

  describe('outside a terminal', () => {
    beforeEach(() => {
      setStdoutIsTTY(false);
    });

    it('writes plain lines with no gutter, symbols, or color', () => {
      const stdoutWrite = jest
        .spyOn(process.stdout, 'write')
        .mockImplementation(() => true);

      log('info', 'base -> button');

      expect(stdoutWrite).toHaveBeenCalledWith('base -> button\n');
      expect(renderMock.info).not.toHaveBeenCalled();

      stdoutWrite.mockRestore();
    });

    it('still separates diagnostics onto stderr', () => {
      const stderrWrite = jest
        .spyOn(process.stderr, 'write')
        .mockImplementation(() => true);

      log('error', 'clone failed');
      log('warn', 'deprecated flag');

      expect(stderrWrite).toHaveBeenCalledWith('clone failed\n');
      expect(stderrWrite).toHaveBeenCalledWith('deprecated flag\n');

      stderrWrite.mockRestore();
    });
  });
});
