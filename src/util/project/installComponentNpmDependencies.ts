import { dirname } from 'path';
import type { Components } from '@emulsify-cli/config';
import CliError from '../../lib/CliError.js';
import log from '../../lib/log.js';
import { note, spinner } from '../../lib/session.js';
import {
  classifyComponentNpmDependencies,
  collectComponentNpmDependencies,
  type ClassifiedComponentNpmDependency,
  type ComponentNpmDependency,
} from './componentNpmDependencies.js';
import {
  detectComponentPackageManager,
  readComponentNpmManifest,
  writeComponentNpmManifest,
  type ComponentPackageManager,
} from './componentNpmManifest.js';
import installDependencies from './installDependencies.js';

type ComponentNpmInstallPlan = {
  root: string;
  manifest: Awaited<ReturnType<typeof readComponentNpmManifest>>;
  manager: ComponentPackageManager;
  packages: ClassifiedComponentNpmDependency[];
  manifestProblem?: string;
};

function formatSpec({ name, range }: ComponentNpmDependency): string {
  const displayRange = range.trim().replace(/\s+/gu, ' ') || '*';
  return `${name}@${displayRange}`;
}

function formatAddCommand(
  manager: ComponentPackageManager,
  packages: readonly ComponentNpmDependency[],
): string | undefined {
  if (manager === 'unsupported') return;
  const command = manager === 'npm' ? 'npm install' : `${manager} add`;
  return `${command} ${packages.map((pkg) => `"${formatSpec(pkg)}"`).join(' ')}`;
}

export function formatAddedNpmPackages(count: number): string {
  return `added ${count} npm package${count === 1 ? '' : 's'}`;
}

export async function prepareComponentNpmInstall(
  system: string,
  components: Components,
  projectConfigPath: string | void,
  reportOnly: boolean,
): Promise<ComponentNpmInstallPlan | undefined> {
  const requirements = collectComponentNpmDependencies(system, components);
  if (requirements.length === 0) return;

  if (!projectConfigPath) {
    throw new CliError(
      'Unable to locate the Emulsify project for npm packages.',
    );
  }

  const root = dirname(projectConfigPath);
  const manifest = await readComponentNpmManifest(root);
  const json = manifest.status === 'ready' ? manifest.json : {};
  let manifestProblem: string | undefined;
  if (manifest.status !== 'ready') {
    const names = [...new Set(requirements.flatMap((pkg) => pkg.components))];
    const specs = requirements.map(formatSpec).join(', ');
    const instruction =
      manifest.status === 'missing'
        ? 'Create it (for example with npm init -y)'
        : 'Provide a valid package.json';
    manifestProblem = `${names.join(', ')} ${names.length === 1 ? 'needs' : 'need'} npm packages (${specs}), but ${manifest.path} ${manifest.reason}. ${instruction} or re-run with --skip-npm.`;
    if (!reportOnly) throw new CliError(manifestProblem);
  }

  return {
    root,
    manifest,
    manager: detectComponentPackageManager(root, json.packageManager),
    packages: classifyComponentNpmDependencies(requirements, json),
    manifestProblem,
  };
}

export function getNpmPackagesToAdd(
  plan: ComponentNpmInstallPlan | undefined,
  skipNpm: boolean,
): string[] {
  if (!plan || skipNpm || plan.manifest.status !== 'ready') return [];
  return plan.packages
    .filter((pkg) => pkg.status === 'missing')
    .map(formatSpec);
}

export function formatComponentNpmInstall(
  plan: ComponentNpmInstallPlan | undefined,
  mode: 'install' | 'preview' | 'skip',
): string {
  if (!plan) return '  - none';

  const lines = plan.packages.map((pkg) => {
    const description = `needed by ${pkg.components.join(', ')}`;
    let status: string;
    switch (pkg.status) {
      case 'satisfied':
        status =
          mode === 'preview' ? 'already satisfied' : 'already in package.json';
        break;
      case 'needs-attention':
        status = `needs attention (package.json has ${JSON.stringify(pkg.declaredRange)})`;
        break;
      case 'missing':
        status =
          plan.manifest.status !== 'ready'
            ? `package.json ${plan.manifest.status}`
            : mode === 'install'
              ? 'added'
              : mode === 'preview'
                ? 'would add'
                : 'would add (skipped)';
        break;
    }
    return `  - ${formatSpec(pkg)}  ·  ${status}  ·  ${description}`;
  });
  if (plan.manifestProblem) lines.push(plan.manifestProblem);

  if (mode === 'skip') {
    const missing = plan.packages.filter((pkg) => pkg.status === 'missing');
    if (missing.length) {
      const command = formatAddCommand(plan.manager, missing);
      lines.push(
        command
          ? `From ${plan.root}, run: ${command}`
          : 'Use the package manager declared in package.json to add these packages.',
      );
    }
  }
  return lines.join('\n');
}

export async function applyComponentNpmInstall(
  plan: ComponentNpmInstallPlan | undefined,
  skipNpm: boolean,
): Promise<number> {
  if (!plan) return 0;

  if (skipNpm || plan.manifest.status !== 'ready') {
    note(formatComponentNpmInstall(plan, 'skip'), 'npm packages');
    return 0;
  }

  const additions = new Map(
    plan.packages
      .filter((pkg) => pkg.status === 'missing')
      .map(({ name, range }) => [name, range]),
  );
  if (additions.size) {
    await writeComponentNpmManifest(plan.manifest, additions);
  }

  note(formatComponentNpmInstall(plan, 'install'), 'npm packages');
  for (const pkg of plan.packages) {
    if (pkg.status !== 'needs-attention') continue;
    const command = formatAddCommand(plan.manager, [pkg]);
    log(
      'warn',
      `${pkg.name} is in package.json as ${JSON.stringify(pkg.declaredRange)}, but ${pkg.components.join(', ')} ${pkg.components.length === 1 ? 'needs' : 'need'} "${pkg.range}". ${command ? `To change the declaration, run: ${command}` : 'Review the declaration using your project’s package manager.'}`,
    );
  }

  if (additions.size === 0) return 0;
  if (plan.manager !== 'npm') {
    const instructions =
      plan.manager === 'unsupported'
        ? 'Use the package manager declared in package.json to install these packages.'
        : `From ${plan.root}, run: ${plan.manager} install`;
    log('info', instructions);
    return additions.size;
  }

  const progress = spinner();
  progress.start('Installing npm packages');
  try {
    await installDependencies(plan.root);
  } catch (error) {
    progress.error('Unable to install npm packages');
    const output = (
      error instanceof Error ? error.message : String(error)
    ).trim();
    throw new CliError(
      `npm install failed:\n${output}\nRun npm install in ${plan.root} to finish installing the packages.`,
    );
  }
  progress.stop(
    `Installed ${additions.size} npm package${additions.size === 1 ? '' : 's'} with npm`,
  );
  return additions.size;
}
