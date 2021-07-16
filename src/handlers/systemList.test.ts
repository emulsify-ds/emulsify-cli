jest.mock('../lib/log', () => jest.fn());

import log from '../lib/log';
import systemList from './systemList';
import getAvailableSystems from '../util/system/getAvailableSystems';

describe('systemList', () => {
  it('can list all available out-of-the-box systems', async () => {
    expect.assertions(1);
    const systems = await getAvailableSystems();
    await systemList();
    expect(log).toHaveBeenCalledTimes(systems.length);
  });
});
