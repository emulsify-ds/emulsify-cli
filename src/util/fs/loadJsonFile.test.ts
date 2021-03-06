jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
  },
}));

import { promises as fs } from 'fs';
import loadJsonFile from './loadJsonFile';

const readFileMock = fs.readFile as jest.Mock;

describe('loadJsonFile', () => {
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
    await expect(loadJsonFile('path.json')).resolves.toBe(undefined);
  });
});
