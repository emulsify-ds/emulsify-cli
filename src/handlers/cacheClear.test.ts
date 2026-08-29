jest.mock('../lib/constants', () => ({
  CACHE_DIR: '/home/uname/.emulsify/cache',
}));
jest.mock('../lib/log', () => jest.fn());

import { promises as fs } from 'fs';
import CliError from '../lib/CliError.js';
import log from '../lib/log.js';
import cacheClear from './cacheClear.js';

const readdirMock = fs.readdir as jest.Mock;
const rmMock = fs.rm as jest.Mock;
const logMock = log as jest.Mock;

const directory = (name: string) => ({
  name,
  isDirectory: () => true,
});
const file = (name: string) => ({
  name,
  isDirectory: () => false,
});

describe('cacheClear', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    rmMock.mockResolvedValue(undefined);
  });

  function mockPopulatedCache(): void {
    readdirMock
      .mockResolvedValueOnce([
        directory('systems'),
        directory('variants'),
        file('README'),
      ])
      .mockResolvedValueOnce([
        directory('system-entry-one'),
        directory('system-entry-two'),
        file('ignored-file'),
      ])
      .mockResolvedValueOnce([directory('variant-entry')]);
  }

  it('reports bucket and entry counts before removing the cache', async () => {
    mockPopulatedCache();

    await cacheClear();

    expect(rmMock).toHaveBeenCalledWith('/home/uname/.emulsify/cache', {
      recursive: true,
      force: true,
    });
    expect(logMock).toHaveBeenCalledWith(
      'success',
      'Cleared the Emulsify cache: removed 2 buckets and 3 entries.',
    );
  });

  it('reports cache contents without removing them during a dry run', async () => {
    mockPopulatedCache();

    await cacheClear({ dryRun: true });

    expect(rmMock).not.toHaveBeenCalled();
    expect(logMock).toHaveBeenCalledWith(
      'info',
      'Dry run: the Emulsify cache contains 2 buckets and 3 entries. No files were removed.',
    );
  });

  it('exits successfully when the cache directory does not exist', async () => {
    readdirMock.mockRejectedValueOnce(
      Object.assign(new Error('missing'), { code: 'ENOENT' }),
    );

    await expect(cacheClear()).resolves.toBeUndefined();

    expect(rmMock).not.toHaveBeenCalled();
    expect(logMock).toHaveBeenCalledWith(
      'info',
      'The Emulsify cache is already empty: 0 buckets and 0 entries.',
    );
  });

  it('clears an existing cache with no buckets', async () => {
    readdirMock.mockResolvedValueOnce([]);

    await cacheClear();

    expect(rmMock).toHaveBeenCalledTimes(1);
    expect(logMock).toHaveBeenCalledWith(
      'success',
      'Cleared the Emulsify cache: removed 0 buckets and 0 entries.',
    );
  });

  it('wraps cache inspection failures in CliError', async () => {
    readdirMock.mockRejectedValueOnce(
      Object.assign(new Error('permission denied'), { code: 'EACCES' }),
    );

    await expect(cacheClear()).rejects.toEqual(
      new CliError(
        'Unable to inspect the Emulsify cache at "/home/uname/.emulsify/cache": permission denied',
      ),
    );
    expect(rmMock).not.toHaveBeenCalled();
  });

  it('wraps bucket inspection failures in CliError', async () => {
    readdirMock
      .mockResolvedValueOnce([directory('systems')])
      .mockRejectedValueOnce('read failed');

    await expect(cacheClear()).rejects.toEqual(
      new CliError(
        'Unable to inspect the Emulsify cache at "/home/uname/.emulsify/cache": read failed',
      ),
    );
    expect(rmMock).not.toHaveBeenCalled();
  });

  it('wraps cache removal failures in CliError', async () => {
    readdirMock.mockResolvedValueOnce([]);
    rmMock.mockRejectedValueOnce(new Error('remove failed'));

    await expect(cacheClear()).rejects.toEqual(
      new CliError(
        'Unable to clear the Emulsify cache at "/home/uname/.emulsify/cache": remove failed',
      ),
    );
  });
});
