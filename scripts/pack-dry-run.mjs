import {
  assertPackageContents,
  packPackage,
  printPackageSummary,
  reportError,
} from './package-helpers.mjs';

try {
  const { packResult } = packPackage({ dryRun: true });
  assertPackageContents(packResult);
  printPackageSummary(packResult, 'Package dry run verified');
} catch (error) {
  reportError('Package dry run failed', error);
  process.exitCode = 1;
}
