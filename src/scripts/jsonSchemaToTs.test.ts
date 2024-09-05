import { jest } from '@jest/globals';

jest.mock('json-schema-to-typescript', () => ({
  /* eslint-disable-next-line @typescript-eslint/require-await */
  compileFromFile: jest.fn().mockImplementation(async () => 'the typescript'),
}));

import { join, resolve } from 'path';
import { compileFromFile } from 'json-schema-to-typescript';
import { writeFileSync } from 'fs';
import { resolveCurrentPath } from '../util/fs/resolveCurrentPath.js';

import main from './jsonSchemaToTs.js';

describe('jsonSchemaToTs', () => {
  beforeEach(() => {
    (compileFromFile as jest.Mock).mockClear();
    (writeFileSync as jest.Mock).mockClear();
  });

  const { directoryPath } = resolveCurrentPath();
  const schemaDir = resolve(directoryPath, '..', 'schemas');
  const typesDir = resolve(directoryPath, '..', 'types');

  it('can compile the specified schemas', async () => {
    expect.assertions(2);
    await main(['system']);
    expect(compileFromFile).toHaveBeenCalledWith(
      join(schemaDir, 'system.json'),
      {
        cwd: expect.any(String),
        style: { singleQuote: true },
      },
    );
    expect(writeFileSync).toHaveBeenCalledWith(
      join(typesDir, '_system.d.ts'),
      'the typescript',
    );
  });
});
