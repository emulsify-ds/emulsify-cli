import { promises as fs } from 'fs';
import loadJsonFile from './loadJsonFile.js';

const readFileMock = fs.readFile as jest.Mock;

describe('loadJsonFile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('can read and parse json from a file located within the users current path', async () => {
    expect.assertions(2);
    readFileMock.mockResolvedValueOnce('{ "field": "value" }');
    await expect(loadJsonFile('path.json')).resolves.toEqual({
      field: 'value',
    });
    expect(readFileMock).toHaveBeenCalledWith('path.json', {
      encoding: 'utf-8',
    });
  });

  it('returns void if the file is not found', async () => {
    expect.assertions(1);
    readFileMock.mockRejectedValueOnce(
      Object.assign(new Error('not found'), { code: 'ENOENT' }),
    );

    await expect(loadJsonFile('path.json')).resolves.toBe(undefined);
  });

  it('throws a clear error if an existing file contains malformed json', async () => {
    expect.assertions(1);
    readFileMock.mockResolvedValueOnce('{ "field": ');

    await expect(loadJsonFile('path.json')).rejects.toThrow(
      'Invalid JSON in "path.json":',
    );
  });

  it('throws non-missing read errors', async () => {
    expect.assertions(1);
    readFileMock.mockRejectedValueOnce(
      Object.assign(new Error('permission denied'), { code: 'EACCES' }),
    );

    await expect(loadJsonFile('path.json')).rejects.toThrow(
      'permission denied',
    );
  });
});
