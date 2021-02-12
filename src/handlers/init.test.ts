jest
  .spyOn(global.console, 'log')
  .mockImplementation((input: string): string => input);

import init from './init';

describe('init', () => {
  it('logs to the console', () => {
    init('test', './themes/cornflake');
    expect((global.console.log as jest.Mock).mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          "Initializing test Emulsify project in ./themes/cornflake",
        ],
      ]
    `);
  });
});
