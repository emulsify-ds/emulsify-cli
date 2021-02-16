import R from 'ramda';

jest.spyOn(global.console, 'log').mockImplementation(R.identity);
jest.spyOn(global.console, 'info').mockImplementation(R.identity);
jest.spyOn(global.console, 'error').mockImplementation(R.identity);
jest.spyOn(global.console, 'warn').mockImplementation(R.identity);

import log from './log';

describe('log', () => {
  it('can log info messages', () => {
    expect.assertions(1);
    log('info', 'information');
    expect((global.console.info as jest.Mock).mock.calls)
      .toMatchInlineSnapshot(`
      Array [
        Array [
          "[36minformation[39m",
        ],
      ]
    `);
  });

  it('can log error messages', () => {
    expect.assertions(1);
    log('error', 'error message');
    expect((global.console.error as jest.Mock).mock.calls)
      .toMatchInlineSnapshot(`
      Array [
        Array [
          "[37m[41m[1merror message[22m[49m[39m",
        ],
      ]
    `);
  });

  it('can log warning messages', () => {
    expect.assertions(1);
    log('warn', 'warn message');
    expect((global.console.warn as jest.Mock).mock.calls)
      .toMatchInlineSnapshot(`
      Array [
        Array [
          "[33m[1mwarn message[22m[39m",
        ],
      ]
    `);
  });

  it('can write other types of messages', () => {
    expect.assertions(1);
    log('success', 'success message');
    expect((global.console.log as jest.Mock).mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          "[32msuccess message[39m",
        ],
      ]
    `);
  });
});
