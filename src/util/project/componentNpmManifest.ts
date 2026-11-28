import { existsSync, promises as fs } from 'fs';
import { dirname, join } from 'path';
import CliError from '../../lib/CliError.js';

type ReadyManifest = {
  status: 'ready';
  path: string;
  source: string;
  json: Record<string, unknown>;
};

type ManifestResult =
  | ReadyManifest
  | {
      status: 'missing' | 'invalid' | 'unreadable';
      path: string;
      reason: string;
    };

export type ComponentPackageManager =
  'npm' | 'pnpm' | 'yarn' | 'bun' | 'unsupported';

const lockfiles = [
  ['pnpm-lock.yaml', 'pnpm'],
  ['yarn.lock', 'yarn'],
  ['bun.lock', 'bun'],
  ['bun.lockb', 'bun'],
  ['package-lock.json', 'npm'],
  ['npm-shrinkwrap.json', 'npm'],
] as const;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export async function readComponentNpmManifest(
  projectRoot: string,
): Promise<ManifestResult> {
  const path = join(projectRoot, 'package.json');
  let source: string;
  try {
    source = await fs.readFile(path, 'utf8');
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return { status: 'missing', path, reason: 'does not exist' };
    }
    return { status: 'unreadable', path, reason: 'could not be read' };
  }

  let json: unknown;
  try {
    json = JSON.parse(source);
  } catch {
    return { status: 'invalid', path, reason: 'does not contain valid JSON' };
  }

  if (!isObject(json)) {
    return {
      status: 'invalid',
      path,
      reason: 'does not contain a JSON object',
    };
  }
  if (Object.hasOwn(json, 'dependencies') && !isObject(json.dependencies)) {
    return {
      status: 'invalid',
      path,
      reason: 'has a dependencies field that is not an object',
    };
  }
  return { status: 'ready', path, source, json };
}

export function detectComponentPackageManager(
  projectRoot: string,
  packageManager?: unknown,
): ComponentPackageManager {
  if (typeof packageManager === 'string' && packageManager.trim()) {
    const name = packageManager.split('@')[0];
    if (
      name === 'npm' ||
      name === 'pnpm' ||
      name === 'yarn' ||
      name === 'bun'
    ) {
      return name;
    }
    return 'unsupported';
  }

  return (
    lockfiles.find(([file]) => existsSync(join(projectRoot, file)))?.[1] ??
    'npm'
  );
}

// Locate the top-level object in valid JSON so unrelated keys and whitespace
// stay intact, including keys that JSON.stringify would reorder.
function findDependenciesObject(
  source: string,
): { start: number; end: number } | undefined {
  let depth = 0;
  let isDependenciesProperty = false;
  let start: number | undefined;
  let result: { start: number; end: number } | undefined;

  for (const token of source.matchAll(/("(?:[^"\\]|\\.)*")(\s*:)?|[{}\[\]]/g)) {
    const [value, key, colon] = token;
    if (depth === 1 && colon) {
      isDependenciesProperty = JSON.parse(key) === 'dependencies';
    } else if (value === '{' || value === '[') {
      if (depth === 1 && isDependenciesProperty) {
        start = token.index;
      }
      depth++;
    } else if (value === '}' || value === ']') {
      depth--;
      if (depth === 1 && start !== undefined) {
        result = { start, end: token.index + 1 };
        start = undefined;
      }
    }
  }

  return result;
}

function updateSource(
  { source, json }: ReadyManifest,
  dependencies: ReadonlyMap<string, unknown>,
): string {
  const newline = source.includes('\r\n') ? '\r\n' : '\n';
  const multiline = source.trim().includes('\n');
  const indent = source.match(/^([ \t]+)"/m)?.[1] ?? '  ';
  const entries = [...dependencies.keys()].sort().map((name) => {
    const value = dependencies.get(name);
    if (!multiline) {
      return `${JSON.stringify(name)}:${JSON.stringify(value)}`;
    }
    const formattedValue = JSON.stringify(value, null, indent).replaceAll(
      '\n',
      `${newline}${indent}${indent}`,
    );
    return `${indent}${indent}${JSON.stringify(name)}: ${formattedValue}`;
  });
  const object = multiline
    ? `{${newline}${entries.join(`,${newline}`)}${newline}${indent}}`
    : `{${entries.join(',')}}`;

  const previous = findDependenciesObject(source);
  if (previous) {
    return (
      source.slice(0, previous.start) + object + source.slice(previous.end)
    );
  }

  const end = source.slice(0, source.lastIndexOf('}')).trimEnd().length;
  const comma = Object.keys(json).length > 0 ? ',' : '';
  const property = multiline
    ? `${newline}${indent}"dependencies": ${object}`
    : `"dependencies":${object}`;
  return source.slice(0, end) + comma + property + source.slice(end);
}

export async function writeComponentNpmManifest(
  manifest: ReadyManifest,
  additions: ReadonlyMap<string, string>,
): Promise<void> {
  const { path, source, json } = manifest;
  const dependencies = new Map(
    Object.entries(isObject(json.dependencies) ? json.dependencies : {}),
  );
  const previousCount = dependencies.size;
  for (const [name, range] of additions) {
    if (!dependencies.has(name)) {
      dependencies.set(name, range);
    }
  }
  if (dependencies.size === previousCount) {
    return;
  }

  const temporaryPath = join(dirname(path), '.package.json.emulsify.tmp');
  let temporaryFile;
  try {
    // The staging file also prevents two CLI writers from both passing the
    // unchanged-source check before either renames over the manifest.
    temporaryFile = await fs.open(temporaryPath, 'wx', 0o600);
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'EEXIST') {
      throw new CliError(
        `A package.json update is already staged at ${temporaryPath}. Wait for any running Emulsify installs to finish. If the file remains once they have finished, remove it and retry.`,
      );
    }
    throw new CliError(`Unable to create ${temporaryPath}: ${String(error)}.`);
  }

  try {
    try {
      const mode = (await fs.stat(path)).mode & 0o7777;
      await temporaryFile.writeFile(
        updateSource(manifest, dependencies),
        'utf8',
      );
      // chmod restores permission bits masked by the current process umask.
      await temporaryFile.chmod(mode);
      await temporaryFile.sync();
    } finally {
      await temporaryFile.close();
    }
    if ((await fs.readFile(path, 'utf8')) !== source) {
      throw new CliError(
        `${path} changed during installation. Re-run the command to apply the npm packages.`,
      );
    }
    await fs.rename(temporaryPath, path);
  } catch (error) {
    let cleanup = '';
    try {
      await fs.rm(temporaryPath, { force: true });
    } catch (cleanupError) {
      cleanup = ` Temporary-file cleanup also failed: ${String(cleanupError)}`;
    }
    throw new CliError(`Unable to update ${path}: ${String(error)}.${cleanup}`);
  }
}
