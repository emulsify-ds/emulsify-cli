import { promises as fs } from 'fs';
import writeToJsonFile from './writeToJsonFile';

const writeFileMock = (fs.writeFile as jest.Mock).mockResolvedValue(true);

describe('writeToJsonFile', () => {
  it('can write given data to a json file', async () => {
    expect.assertions(2);
    await expect(
      writeToJsonFile('path.json', {
        key: 'value',
      })
    ).resolves.toBe(undefined);
    expect(writeFileMock).toHaveBeenCalledWith(
      'path.json',
      expect.any(String),
      { encoding: 'utf-8' }
    );
  });

  it('throws an error if the file cannot be written', async () => {
    expect.assertions(1);
    writeFileMock.mockImplementationOnce(() => {
      throw new Error('Unable to write to a file that does not exist');
    });

    await expect(writeToJsonFile('path.json', {})).rejects.toEqual(
      Error('Unable to write to path.json with the given JSON: {}')
    );
  });
});
