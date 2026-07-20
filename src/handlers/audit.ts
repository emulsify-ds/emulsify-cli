import { spawnSync, type SpawnSyncReturns } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import CliError from '../lib/CliError.js';

const CORE_PACKAGE_JSON = '@emulsify/core/package.json';
const CORE_AUDIT_BIN = 'emulsify-audit';
const AUDIT_FAILURE_EXIT_CODE = 2;

type SpawnAuditProcess = (
  command: string,
  args: string[],
  options: {
    cwd: string;
    shell: false;
    stdio: 'inherit';
  },
) => SpawnSyncReturns<Buffer>;

export interface AuditHandlerOptions {
  cwd?: string;
  execPath?: string;
  spawnProcess?: SpawnAuditProcess;
}

interface CorePackageMetadata {
  version?: unknown;
  bin?: unknown;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function getCoreVersionLabel(packageMetadata: CorePackageMetadata): string {
  return typeof packageMetadata.version === 'string' &&
    packageMetadata.version.length > 0
    ? ` ${packageMetadata.version}`
    : '';
}

/**
 * Find the requested audit root without consuming or rewriting Core's options.
 *
 * Core owns argument validation. Invalid or missing --root values deliberately
 * fall back to the invocation directory here so Core can report the original
 * argument failure with its own output and exit behavior.
 */
export function getAuditProjectRoot(args: string[], cwd: string): string {
  let requestedRoot: string | undefined;

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];

    if (argument === '--root') {
      const value = args[index + 1];
      if (value && !value.startsWith('--')) {
        requestedRoot = value;
        index += 1;
      }
      continue;
    }

    if (argument.startsWith('--root=')) {
      const value = argument.slice('--root='.length);
      if (value) {
        requestedRoot = value;
      }
    }
  }

  return resolve(cwd, requestedRoot ?? '.');
}

/**
 * Resolve the audit executable declared by the project-installed Core package.
 */
export function resolveCoreAuditBin(projectRoot: string): string {
  let corePackagePath: string;

  try {
    const projectRequire = createRequire(resolve(projectRoot, 'package.json'));
    corePackagePath = projectRequire.resolve(CORE_PACKAGE_JSON);
  } catch {
    throw new CliError(
      `Unable to run "emulsify audit": @emulsify/core is not installed for project root "${projectRoot}". Install @emulsify/core in that project and try again.`,
      AUDIT_FAILURE_EXIT_CODE,
    );
  }

  let packageMetadata: CorePackageMetadata;
  try {
    const parsedMetadata: unknown = JSON.parse(
      readFileSync(corePackagePath, 'utf8'),
    );
    if (
      !parsedMetadata ||
      typeof parsedMetadata !== 'object' ||
      Array.isArray(parsedMetadata)
    ) {
      throw new Error('package metadata must be a JSON object');
    }
    packageMetadata = parsedMetadata as CorePackageMetadata;
  } catch (error) {
    throw new CliError(
      `Unable to read the installed @emulsify/core package metadata at "${corePackagePath}": ${getErrorMessage(error)}. Reinstall @emulsify/core and try again.`,
      AUDIT_FAILURE_EXIT_CODE,
    );
  }

  const bins = packageMetadata.bin;
  const auditBin =
    bins && typeof bins === 'object'
      ? (bins as Record<string, unknown>)[CORE_AUDIT_BIN]
      : undefined;

  if (typeof auditBin !== 'string' || auditBin.trim().length === 0) {
    throw new CliError(
      `Installed @emulsify/core${getCoreVersionLabel(packageMetadata)} does not expose package.json#bin["${CORE_AUDIT_BIN}"]. Upgrade @emulsify/core and try again.`,
      AUDIT_FAILURE_EXIT_CODE,
    );
  }

  const auditPath = resolve(dirname(corePackagePath), auditBin);
  try {
    if (!statSync(auditPath).isFile()) {
      throw new Error('the declared target is not a file');
    }
  } catch {
    throw new CliError(
      `Installed @emulsify/core${getCoreVersionLabel(packageMetadata)} declares an unavailable "${CORE_AUDIT_BIN}" target at "${auditPath}". Reinstall @emulsify/core and try again.`,
      AUDIT_FAILURE_EXIT_CODE,
    );
  }

  return auditPath;
}

/**
 * Run Core's audit process with unchanged arguments and inherited stdio.
 */
export function executeCoreAudit(
  auditPath: string,
  args: string[],
  cwd: string,
  execPath = process.execPath,
  spawnProcess: SpawnAuditProcess = spawnSync,
): number {
  let result: SpawnSyncReturns<Buffer>;

  try {
    result = spawnProcess(execPath, [auditPath, ...args], {
      cwd,
      shell: false,
      stdio: 'inherit',
    });
  } catch (error) {
    throw new CliError(
      `Unable to start the project-installed "${CORE_AUDIT_BIN}" process: ${getErrorMessage(error)}`,
      AUDIT_FAILURE_EXIT_CODE,
    );
  }

  if (result.error) {
    throw new CliError(
      `Unable to start the project-installed "${CORE_AUDIT_BIN}" process: ${result.error.message}`,
      AUDIT_FAILURE_EXIT_CODE,
    );
  }

  if (typeof result.status !== 'number') {
    throw new CliError(
      `The project-installed "${CORE_AUDIT_BIN}" process ended without an exit status.`,
      AUDIT_FAILURE_EXIT_CODE,
    );
  }

  return result.status;
}

/**
 * Handler for the transparent `emulsify audit [...args]` Core façade.
 */
export default function audit(
  args: string[],
  {
    cwd = process.cwd(),
    execPath = process.execPath,
    spawnProcess = spawnSync,
  }: AuditHandlerOptions = {},
): void {
  const projectRoot = getAuditProjectRoot(args, cwd);
  const auditPath = resolveCoreAuditBin(projectRoot);

  process.exitCode = executeCoreAudit(
    auditPath,
    args,
    cwd,
    execPath,
    spawnProcess,
  );
}
