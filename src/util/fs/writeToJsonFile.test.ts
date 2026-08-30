import { promises as fs } from 'fs';
import { basename, dirname } from 'path';
import writeToJsonFile from './writeToJsonFile.js';

const writeFileMock = fs.writeFile as jest.Mock;
const renameMock = fs.rename as jest.Mock;
const rmMock = fs.rm as jest.Mock;

describe('writeToJsonFile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    writeFileMock.mockResolvedValue(undefined);
    renameMock.mockResolvedValue(undefined);
    rmMock.mockResolvedValue(undefined);
  });

  it('writes to a unique sibling temp file before renaming it over the target', async () => {
    const path = '/project/project.emulsify.json';
    const json = { key: 'value' };

    await expect(writeToJsonFile(path, json)).resolves.toBe(undefined);

    const temporaryPath = writeFileMock.mock.calls[0][0] as string;

    expect(dirname(temporaryPath)).toBe(dirname(path));
    expect(basename(temporaryPath)).toMatch(
      /^\.project\.emulsify\.json\.\d+\.[0-9a-f-]+\.tmp$/,
    );
    expect(writeFileMock).toHaveBeenCalledWith(
      temporaryPath,
      JSON.stringify(json, null, 2),
      { encoding: 'utf-8', flag: 'wx', flush: true },
    );
    expect(renameMock).toHaveBeenCalledWith(temporaryPath, path);
    expect(writeFileMock.mock.invocationCallOrder[0]).toBeLessThan(
      renameMock.mock.invocationCallOrder[0],
    );
    expect(rmMock).not.toHaveBeenCalled();
  });

  it('leaves the original untouched and removes the temp after a failed write', async () => {
    const path = '/project/project.emulsify.json';
    const json = { secret: 'must not appear in the error' };
    const writeError = new Error('ENOSPC: no space left on device');
    writeFileMock.mockRejectedValueOnce(writeError);

    await expect(writeToJsonFile(path, json)).rejects.toMatchObject({
      message: `Unable to write JSON file at ${path}: Error: ENOSPC: no space left on device.`,
      cause: writeError,
    });

    const temporaryPath = writeFileMock.mock.calls[0][0] as string;

    expect(temporaryPath).not.toBe(path);
    expect(writeFileMock).toHaveBeenCalledTimes(1);
    expect(renameMock).not.toHaveBeenCalled();
    expect(rmMock).toHaveBeenCalledWith(temporaryPath, { force: true });
  });

  it('removes the temp after a failed rename', async () => {
    const path = '/project/project.emulsify.json';
    const renameError = new Error('EPERM: rename failed');
    renameMock.mockRejectedValueOnce(renameError);

    await expect(writeToJsonFile(path, {})).rejects.toMatchObject({
      message: `Unable to write JSON file at ${path}: Error: EPERM: rename failed.`,
      cause: renameError,
    });

    const temporaryPath = writeFileMock.mock.calls[0][0] as string;

    expect(rmMock).toHaveBeenCalledWith(temporaryPath, { force: true });
  });

  it('reports a cleanup failure without exposing the serialized JSON', async () => {
    const path = '/project/project.emulsify.json';
    const writeError = new Error('EIO: write failed');
    writeFileMock.mockRejectedValueOnce(writeError);
    rmMock.mockRejectedValueOnce(new Error('EACCES: cleanup failed'));

    const result = writeToJsonFile(path, {
      secret: 'must not appear in the error',
    });

    await expect(result).rejects.toThrow(
      `Unable to write JSON file at ${path}: Error: EIO: write failed. Temporary-file cleanup also failed: Error: EACCES: cleanup failed`,
    );
    await expect(result).rejects.not.toThrow('must not appear in the error');
  });
});
