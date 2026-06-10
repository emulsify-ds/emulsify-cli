import { register } from 'node:module';
import { pathToFileURL } from 'node:url';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const moduleDirectory = dirname(fileURLToPath(import.meta.url));

// Register ts-node's ESM loader from this module's directory so schema generation
// works no matter which current working directory invokes the script.
register('ts-node/esm', pathToFileURL(`${moduleDirectory}/`));
