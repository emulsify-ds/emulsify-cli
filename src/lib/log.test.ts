import R from 'ramda';

jest.spyOn(global.console, 'log').mockImplementation(R.identity);
jest.spyOn(global.console, 'info').mockImplementation(R.identity);
jest.spyOn(global.console, 'error').mockImplementation(R.identity);
jest.spyOn(global.console, 'warn').mockImplementation(R.identity);
jest
  .spyOn(global.process, 'exit')
  .mockImplementation(R.identity as () => never);

import log from './log';

describe('log', () => {
  it('can log info messages', () => {
    expect.assertions(1);
    log('info', 'information');
    expect((global.console.info as jest.Mock).mock.calls).toMatchSnapshot();
  });

  it('can log error messages', () => {
    expect.assertions(1);
    log('error', 'error message');
    expect((global.console.error as jest.Mock).mock.calls).toMatchSnapshot();
  });

  it('can log warning messages', () => {
    expect.assertions(1);
    log('warn', 'warn message');
    expect((global.console.warn as jest.Mock).mock.calls).toMatchSnapshot();
  });

  it('can write other types of messages', () => {
    expect.assertions(1);
    log('success', 'success message');
    expect((global.console.log as jest.Mock).mock.calls).toMatchSnapshot();
  });

  it('exits with the given code if one is provided', () => {
    log('error', 'big oof', 1);
    expect(
      ((global.process.exit as unknown) as jest.Mock).mock.calls
    ).toMatchSnapshot();
  });
});
