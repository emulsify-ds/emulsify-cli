import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const repositoryRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '..',
);

export const packageManifest = JSON.parse(
  readFileSync(resolve(repositoryRoot, 'package.json'), 'utf8'),
);

export const requiredPackagePaths = [
  'LICENSE',
  'README.md',
  'package.json',
  'dist/index.js',
  'dist/schemas/emulsifyProjectConfig.json',
  'dist/schemas/system.json',
  'dist/schemas/variant.json',
];

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const maxPackageEntries = 100;

function displayArgument(argument) {
  return /^[A-Za-z0-9_./:@=+-]+$/.test(argument)
    ? argument
    : JSON.stringify(argument);
}

function displayCommand(command, args) {
  return [command, ...args].map(displayArgument).join(' ');
}

function ensureTrailingNewline(value) {
  return value.endsWith('\n') ? value : `${value}\n`;
}

export function reportError(heading, error) {
  const detail =
    error instanceof Error ? error.stack || error.message : String(error);
  process.stderr.write(`${heading}\n${ensureTrailingNewline(detail)}`);
}

export function printCommandDiagnostics(
  result,
  heading = 'Child process failed',
) {
  const exitDescription =
    result.status === null
      ? `signal ${result.signal || 'unknown'}`
      : `exit ${result.status}`;

  process.stderr.write(
    [
      '',
      heading,
      `Command: ${displayCommand(result.command, result.args)}`,
      `Working directory: ${result.cwd}`,
      `Result: ${exitDescription}`,
      'stdout:',
      result.stdout || '(empty)',
      'stderr:',
      result.stderr || '(empty)',
      '',
    ].join('\n'),
  );
}

export function runCommand(
  command,
  args,
  { cwd = repositoryRoot, env = {}, shell = false } = {},
) {
  const childEnv = {
    ...process.env,
    NO_COLOR: '1',
    npm_config_color: 'false',
    npm_config_progress: 'false',
    npm_config_update_notifier: 'false',
    ...env,
  };

  // FORCE_COLOR takes precedence over NO_COLOR in Node and several CLI
  // libraries, so inherited developer settings must not affect assertions.
  delete childEnv.FORCE_COLOR;

  const child = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    env: childEnv,
    maxBuffer: 10 * 1024 * 1024,
    shell,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const result = {
    command,
    args,
    cwd,
    status: child.status,
    signal: child.signal,
    stdout: child.stdout || '',
    stderr: child.stderr || '',
  };

  if (child.error || child.status !== 0) {
    printCommandDiagnostics(result);
    const message = child.error
      ? `${displayCommand(command, args)} could not start: ${child.error.message}`
      : `${displayCommand(command, args)} failed with ${
          child.signal ? `signal ${child.signal}` : `exit ${child.status}`
        }`;
    throw new Error(message, child.error ? { cause: child.error } : undefined);
  }

  return result;
}

export function runNpm(args, options) {
  return runCommand(npmCommand, args, options);
}

function parsePackJson(commandResult) {
  let parsed;

  try {
    parsed = JSON.parse(commandResult.stdout);
  } catch (error) {
    printCommandDiagnostics(
      commandResult,
      'npm pack succeeded but did not return valid JSON',
    );
    throw new Error('Unable to parse npm pack JSON output', { cause: error });
  }

  if (!Array.isArray(parsed) || parsed.length !== 1) {
    printCommandDiagnostics(
      commandResult,
      'npm pack returned an unexpected JSON result',
    );
    throw new Error(
      `Expected npm pack to describe one package, received ${
        Array.isArray(parsed) ? parsed.length : typeof parsed
      }`,
    );
  }

  return parsed[0];
}

export function packPackage({ dryRun = false, packDestination } = {}) {
  const args = ['pack'];

  if (dryRun) {
    args.push('--dry-run');
  }

  args.push('--ignore-scripts', '--json');

  if (packDestination) {
    args.push('--pack-destination', packDestination);
  }

  const commandResult = runNpm(args, { cwd: repositoryRoot });

  return {
    commandResult,
    packResult: parsePackJson(commandResult),
  };
}

function normalizePackagePath(path) {
  return path.replaceAll('\\', '/').replace(/^\.\/+/, '');
}

function describePaths(paths) {
  return [...new Set(paths)].sort().join(', ');
}

export function assertPackageContents(packResult) {
  const issues = [];

  if (!Array.isArray(packResult.files)) {
    throw new Error('npm pack JSON result does not contain a files array');
  }

  const files = packResult.files.map((file) => ({
    ...file,
    path: normalizePackagePath(String(file.path)),
  }));
  const paths = files.map((file) => file.path);
  const pathSet = new Set(paths);

  const duplicates = paths.filter(
    (path, index) => paths.indexOf(path) !== index,
  );
  if (duplicates.length > 0) {
    issues.push(`duplicate package paths: ${describePaths(duplicates)}`);
  }

  const missing = requiredPackagePaths.filter((path) => !pathSet.has(path));
  if (missing.length > 0) {
    issues.push(`missing required paths: ${describePaths(missing)}`);
  }

  const forbidden = [];
  for (const path of paths) {
    const lowerPath = path.toLowerCase();
    const segments = lowerPath.split('/');
    const basename = segments.at(-1);
    const hasForbiddenDirectory = segments.some((segment) =>
      [
        'node_modules',
        'coverage',
        '.nyc_output',
        '.cache',
        '.npm',
        'test',
        'tests',
        '__tests__',
        'testutils',
        'spec',
        'specs',
        '__specs__',
      ].includes(segment),
    );
    const isTestOrSpecFile = /\.(?:test|spec)\.[^/]+$/i.test(path);

    if (
      hasForbiddenDirectory ||
      segments[0] === 'src' ||
      isTestOrSpecFile ||
      lowerPath.endsWith('.tsbuildinfo') ||
      basename === 'package-lock.json' ||
      lowerPath === 'dist/package.json' ||
      lowerPath === 'dist/scripts' ||
      lowerPath.startsWith('dist/scripts/')
    ) {
      forbidden.push(path);
    }
  }

  if (forbidden.length > 0) {
    issues.push(`forbidden package paths: ${describePaths(forbidden)}`);
  }

  if (paths.length > maxPackageEntries) {
    issues.push(
      `package contains ${paths.length} entries; maximum is ${maxPackageEntries}`,
    );
  }

  if (
    !Number.isInteger(packResult.entryCount) ||
    packResult.entryCount !== paths.length
  ) {
    issues.push(
      `entryCount ${String(packResult.entryCount)} does not match files length ${
        paths.length
      }`,
    );
  }

  if (!Array.isArray(packResult.bundled) || packResult.bundled.length !== 0) {
    issues.push(
      `bundled dependencies must be empty; received ${JSON.stringify(
        packResult.bundled,
      )}`,
    );
  }

  const emulsifyBin =
    packageManifest.bin &&
    typeof packageManifest.bin === 'object' &&
    packageManifest.bin.emulsify;

  if (emulsifyBin !== 'dist/index.js') {
    issues.push(
      `package.json bin.emulsify must be dist/index.js; received ${String(
        emulsifyBin,
      )}`,
    );
  }

  const binEntry = files.find((file) => file.path === emulsifyBin);
  if (
    binEntry &&
    (!Number.isInteger(binEntry.mode) || (binEntry.mode & 0o111) === 0)
  ) {
    issues.push(
      `${emulsifyBin} is not executable in the package (mode ${String(
        binEntry.mode,
      )})`,
    );
  }

  if (emulsifyBin) {
    try {
      const binSource = readFileSync(
        resolve(repositoryRoot, emulsifyBin),
        'utf8',
      );
      if (!binSource.startsWith('#!/usr/bin/env node\n')) {
        issues.push(
          `${emulsifyBin} does not begin with the expected Node.js shebang`,
        );
      }
    } catch (error) {
      issues.push(
        `unable to read built bin ${emulsifyBin}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  if (issues.length > 0) {
    throw new Error(
      `Package content verification failed:\n${issues
        .map((issue) => `- ${issue}`)
        .join('\n')}`,
    );
  }

  return { files, paths };
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) {
    return 'unknown size';
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  return `${(bytes / 1024).toFixed(1)} KiB`;
}

export function printPackageSummary(packResult, label) {
  process.stdout.write(
    `${label}: ${packResult.entryCount} files, ${formatBytes(
      packResult.size,
    )} packed, ${formatBytes(packResult.unpackedSize)} unpacked\n`,
  );
}

export function assertCommandOutput(result, expected, label) {
  if (!result.stdout.includes(expected)) {
    printCommandDiagnostics(
      result,
      `${label} succeeded but its output was unexpected`,
    );
    throw new Error(
      `${label} output did not include ${JSON.stringify(expected)}`,
    );
  }
}
