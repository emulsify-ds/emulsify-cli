jest.mock('../lib/log', () => jest.fn());

import log from '../lib/log.js';
import systemList from './systemList.js';
import getAvailableSystems from '../util/system/getAvailableSystems.js';

const logMock = log as jest.Mock;

describe('systemList', () => {
  beforeEach(() => {
    logMock.mockClear();
  });

  it('can list all available out-of-the-box systems', async () => {
    expect.assertions(5);
    const systems = await getAvailableSystems();
    await systemList();
    const loggedMessages = logMock.mock.calls.map(([, message]) => message);

    expect(logMock).toHaveBeenCalledTimes(systems.length);
    expect(logMock).toHaveBeenNthCalledWith(
      1,
      'info',
      'compound - https://github.com/emulsify-ds/compound.git',
    );
    expect(logMock).toHaveBeenNthCalledWith(
      2,
      'info',
      'emulsify-ui-kit - https://github.com/emulsify-ds/emulsify-ui-kit.git',
    );
    expect(loggedMessages).toEqual([
      'compound - https://github.com/emulsify-ds/compound.git',
      'emulsify-ui-kit - https://github.com/emulsify-ds/emulsify-ui-kit.git',
    ]);
    expect(new Set(loggedMessages).size).toBe(loggedMessages.length);
  });
});
