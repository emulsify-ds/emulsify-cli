import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import {
  assertCommandOutput,
  assertPackageContents,
  packPackage,
  packageManifest,
  printPackageSummary,
  reportError,
  requiredPackagePaths,
  runCommand,
  runNpm,
} from './package-helpers.mjs';

function assertCondition(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function smokeTest(tempRoot) {
  const tarballDirectory = join(tempRoot, 'tarballs');
  const projectDirectory = join(tempRoot, 'project');
  mkdirSync(tarballDirectory);
  mkdirSync(projectDirectory);

  writeFileSync(
    join(projectDirectory, 'package.json'),
    `${JSON.stringify(
      {
        name: 'emulsify-cli-packed-smoke-test',
        version: '0.0.0',
        private: true,
      },
      null,
      2,
    )}\n`,
  );

  const { packResult } = packPackage({ packDestination: tarballDirectory });
  assertPackageContents(packResult);

  assertCondition(
    typeof packResult.filename === 'string' && packResult.filename.length > 0,
    'npm pack JSON did not include a tarball filename',
  );

  const tarballPath = resolve(tarballDirectory, packResult.filename);
  assertCondition(
    existsSync(tarballPath),
    `npm pack did not create ${tarballPath}`,
  );

  runNpm(
    [
      'install',
      '--no-audit',
      '--no-fund',
      '--no-package-lock',
      '--save=false',
      tarballPath,
    ],
    { cwd: projectDirectory },
  );

  const installedPackageRoot = join(
    projectDirectory,
    'node_modules',
    ...packageManifest.name.split('/'),
  );
  const installedManifestPath = join(installedPackageRoot, 'package.json');
  assertCondition(
    existsSync(installedManifestPath),
    `Installed package manifest is missing: ${installedManifestPath}`,
  );

  const installedManifest = readJson(installedManifestPath);
  assertCondition(
    installedManifest.name === packageManifest.name,
    `Installed package name is ${String(
      installedManifest.name,
    )}; expected ${packageManifest.name}`,
  );
  assertCondition(
    installedManifest.version === packageManifest.version,
    `Installed package version is ${String(
      installedManifest.version,
    )}; expected ${packageManifest.version}`,
  );
  assertCondition(
    installedManifest.bin &&
      typeof installedManifest.bin === 'object' &&
      installedManifest.bin.emulsify === 'dist/index.js',
    'Installed package does not map the emulsify bin to dist/index.js',
  );

  const missingInstalledPaths = requiredPackagePaths.filter(
    (path) => !existsSync(join(installedPackageRoot, path)),
  );
  assertCondition(
    missingInstalledPaths.length === 0,
    `Installed package is missing: ${missingInstalledPaths.sort().join(', ')}`,
  );

  const installedBinPath = join(
    installedPackageRoot,
    installedManifest.bin.emulsify,
  );
  const installedBinSource = readFileSync(installedBinPath, 'utf8');
  assertCondition(
    installedBinSource.startsWith('#!/usr/bin/env node\n'),
    'Installed dist/index.js does not preserve the Node.js shebang',
  );

  const forbiddenInstalledPaths = [
    'dist/node_modules',
    'dist/package.json',
    'dist/package-lock.json',
    'dist/scripts',
    'src',
    'coverage',
    '.nyc_output',
    '.cache',
    '.npm',
  ].filter((path) => existsSync(join(installedPackageRoot, path)));
  assertCondition(
    forbiddenInstalledPaths.length === 0,
    `Installed package contains forbidden paths: ${forbiddenInstalledPaths
      .sort()
      .join(', ')}`,
  );

  const localBin = join(
    projectDirectory,
    'node_modules',
    '.bin',
    process.platform === 'win32' ? 'emulsify.cmd' : 'emulsify',
  );
  assertCondition(
    existsSync(localBin),
    `npm did not create the installed emulsify shim: ${localBin}`,
  );

  const commandOptions = {
    cwd: projectDirectory,
    shell: process.platform === 'win32',
  };
  const helpResult = runCommand(localBin, ['--help'], commandOptions);
  assertCommandOutput(
    helpResult,
    `Emulsify CLI ${packageManifest.version}`,
    'emulsify --help',
  );
  assertCommandOutput(
    helpResult,
    'New here? Run these in order:',
    'emulsify --help',
  );

  const versionResult = runCommand(localBin, ['--version'], commandOptions);
  assertCommandOutput(
    versionResult,
    `Version: ${packageManifest.version}`,
    'emulsify --version',
  );

  printPackageSummary(packResult, 'Packed install smoke test passed');
}

const tempRoot = mkdtempSync(join(tmpdir(), 'emulsify-cli-pack-'));
let smokeError;
let cleanupError;

try {
  smokeTest(tempRoot);
} catch (error) {
  smokeError = error;
} finally {
  try {
    rmSync(tempRoot, {
      recursive: true,
      force: true,
      maxRetries: 3,
      retryDelay: 100,
    });
  } catch (error) {
    cleanupError = error;
  }
}

if (smokeError) {
  reportError('Packed install smoke test failed', smokeError);
}

if (cleanupError) {
  reportError(
    `Packed install smoke test could not clean ${tempRoot}`,
    cleanupError,
  );
}

if (smokeError || cleanupError) {
  process.exitCode = 1;
}
