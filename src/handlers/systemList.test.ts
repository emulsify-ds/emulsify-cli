jest.mock('../lib/log', () => jest.fn());

import log from '../lib/log.js';
import systemList from './systemList.js';
import getAvailableSystems from '../util/system/getAvailableSystems.js';

describe('systemList', () => {
  it('can list all available out-of-the-box systems', async () => {
    expect.assertions(1);
    const systems = await getAvailableSystems();
    await systemList();
    expect(log).toHaveBeenCalledTimes(systems.length);
  });
});
