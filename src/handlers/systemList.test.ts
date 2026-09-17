jest.mock('../lib/log', () => jest.fn());
jest.mock('../lib/session', () => ({ note: jest.fn() }));

import log from '../lib/log.js';
import { note } from '../lib/session.js';
import systemList, { formatSystemList } from './systemList.js';
import getAvailableSystems from '../util/system/getAvailableSystems.js';

const logMock = log as jest.Mock;
const noteMock = note as jest.Mock;

describe('systemList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('can list all available out-of-the-box systems', async () => {
    expect.assertions(4);
    await systemList();

    expect(noteMock).toHaveBeenCalledTimes(1);
    const [body, title] = noteMock.mock.calls[0];

    expect(title).toBe('Built-in systems');
    expect(body).toContain(
      'compound         https://github.com/emulsify-ds/compound.git',
    );
    expect(body).toContain(
      'emulsify-ui-kit  https://github.com/emulsify-ds/emulsify-ui-kit.git',
    );
  });

  it('summarizes how many systems are available and what to do next', async () => {
    const systems = await getAvailableSystems();

    await expect(systemList()).resolves.toBe(
      `${systems.length} systems  \u00b7  install one with emulsify system install`,
    );
  });

  it('does not write one loose line per system', async () => {
    await systemList();

    expect(logMock).not.toHaveBeenCalled();
  });
});

describe('formatSystemList', () => {
  it('aligns repositories into a column', () => {
    expect(
      formatSystemList([
        { name: 'compound', repository: 'https://example.com/compound.git' },
        { name: 'ui', repository: 'https://example.com/ui.git' },
      ]),
    ).toBe(
      [
        'compound  https://example.com/compound.git',
        'ui        https://example.com/ui.git',
      ].join('\n'),
    );
  });

  it('reports an empty catalog plainly', () => {
    expect(formatSystemList([])).toBe('No built-in systems are available.');
  });
});
