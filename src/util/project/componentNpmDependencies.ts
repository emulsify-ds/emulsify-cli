import { subset, validRange } from 'semver';
import CliError from '../../lib/CliError.js';

const PACKAGE_NAME = /^(?:@[a-z0-9][a-z0-9._~-]*\/)?[a-z0-9][a-z0-9._~-]*$/u;
const DEPENDENCY_SECTIONS = [
  'dependencies',
  'devDependencies',
  'optionalDependencies',
  'peerDependencies',
] as const;

export type ComponentNpmDependency = {
  name: string;
  range: string;
  components: string[];
};

export type ClassifiedComponentNpmDependency = ComponentNpmDependency &
  (
    | { status: 'missing' | 'satisfied' }
    | { status: 'needs-attention'; declaredRange: unknown }
  );

type ComponentDeclaration = {
  name: string;
  npmDependencies?: Readonly<Record<string, string>>;
};

export function collectComponentNpmDependencies(
  systemName: string,
  components: readonly ComponentDeclaration[],
): ComponentNpmDependency[] {
  const packages = new Map<
    string,
    {
      range: string;
      components: Set<string>;
      declarations: Map<string, string>;
    }
  >();

  for (const component of components) {
    for (const [name, range] of Object.entries(
      component.npmDependencies ?? {},
    )) {
      const context = `System ${JSON.stringify(systemName)}, component ${JSON.stringify(component.name)}, npm package ${JSON.stringify(name)}`;
      if (name.length > 214 || !PACKAGE_NAME.test(name)) {
        throw new CliError(`${context} has an invalid npm package name.`);
      }
      if (!validRange(range)) {
        throw new CliError(
          `${context} must use a valid semver range. Received ${JSON.stringify(range)}.`,
        );
      }

      const requirement = packages.get(name);
      if (!requirement) {
        packages.set(name, {
          range,
          components: new Set([component.name]),
          declarations: new Map([[range, component.name]]),
        });
        continue;
      }

      for (const [otherRange, otherComponent] of requirement.declarations) {
        if (
          range !== otherRange &&
          !subset(range, otherRange) &&
          !subset(otherRange, range)
        ) {
          throw new CliError(
            `${context} requires ${JSON.stringify(range)}, which conflicts with ${JSON.stringify(otherRange)} required by component ${JSON.stringify(otherComponent)}.`,
          );
        }
      }

      if (subset(range, requirement.range)) {
        requirement.range = range;
      }
      requirement.components.add(component.name);
      requirement.declarations.set(range, component.name);
    }
  }

  return Array.from(packages, ([name, { range, components }]) => ({
    name,
    range,
    components: [...components],
  }));
}

export function classifyComponentNpmDependencies(
  requirements: readonly ComponentNpmDependency[],
  manifest: Readonly<Record<string, unknown>>,
): ClassifiedComponentNpmDependency[] {
  return requirements.map((requirement) => {
    let declared = false;
    for (const section of DEPENDENCY_SECTIONS) {
      const dependencies = manifest[section];
      if (
        !dependencies ||
        typeof dependencies !== 'object' ||
        Array.isArray(dependencies) ||
        !Object.hasOwn(dependencies, requirement.name)
      ) {
        continue;
      }

      declared = true;
      const declaredRange = (dependencies as Record<string, unknown>)[
        requirement.name
      ];
      if (
        typeof declaredRange !== 'string' ||
        !validRange(declaredRange) ||
        !subset(declaredRange, requirement.range)
      ) {
        return { ...requirement, status: 'needs-attention', declaredRange };
      }
    }

    return { ...requirement, status: declared ? 'satisfied' : 'missing' };
  });
}
