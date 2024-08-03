import { join, resolve, dirname } from 'path';
import { writeFileSync } from 'fs';
import { compileFromFile } from 'json-schema-to-typescript';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
/**
 * Takes a list of schema names that have corresponding schema files in
 * the src/schemas folder. Loads up each json-schema file,
 * compiles it to a typescript d.ts file, and places it in the
 * src/types folder with a name prefixed with an underscore (_).
 *
 * @param schemas array containing the names of schemas within src/schemas.
 */
export default async function main(schemas: string[]): Promise<void[]> {
  const schemaDir = resolve(__dirname, '..', 'schemas');
  const typesDir = resolve(__dirname, '..', 'types');

  return await Promise.all(
    schemas.map((name) =>
      compileFromFile(join(schemaDir, `${name}.json`), {
        cwd: schemaDir,
        style: {
          singleQuote: true,
        },
      }).then((ts) => writeFileSync(join(typesDir, `_${name}.d.ts`), ts)),
    ),
  );
}

// Ignoring the require-await for now. This is a script that will be run with ts-node.
/* eslint-disable-next-line @typescript-eslint/no-floating-promises */
main(['system', 'variant', 'emulsifyProjectConfig']);
