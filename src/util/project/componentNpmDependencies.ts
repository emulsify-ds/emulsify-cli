import {
  Comparator,
  minVersion,
  Range,
  type RangeOptions,
  subset,
  validRange,
} from 'semver';
import CliError from '../../lib/CliError.js';

const PACKAGE_NAME = /^(?:@[a-z0-9][a-z0-9._~-]*\/)?[a-z0-9][a-z0-9._~-]*$/u;
const DEPENDENCY_SECTIONS = ['dependencies', 'devDependencies'] as const;
const NON_SATISFYING_SECTIONS = [
  'optionalDependencies',
  'peerDependencies',
] as const;

export type ComponentNpmDependency = {
  name: string;
  range: string;
  components: string[];
};

export type ClassifiedComponentNpmDependency = ComponentNpmDependency & {
  nonSatisfyingSections?: (typeof NON_SATISFYING_SECTIONS)[number][];
} & (
    | { status: 'missing' | 'satisfied' }
    | { status: 'needs-attention'; declaredRange: unknown }
  );

type ComponentDeclaration = {
  name: string;
  npmDependencies?: Readonly<Record<string, string>>;
};

function prereleaseBase({ value, semver }: Comparator): string | undefined {
  if (value && semver.prerelease.length > 0) {
    return `${semver.major}.${semver.minor}.${semver.patch}`;
  }
}

function intersectComparatorSets(
  left: readonly Comparator[],
  right: readonly Comparator[],
): string | undefined {
  const leftPrereleases = new Set(left.map(prereleaseBase));
  const rightPrereleases = new Set(right.map(prereleaseBase));
  const comparators: Comparator[] = [];

  for (const comparator of [...left, ...right]) {
    const base = prereleaseBase(comparator);
    if (!base || (leftPrereleases.has(base) && rightPrereleases.has(base))) {
      comparators.push(comparator);
      continue;
    }

    // A prerelease must be explicitly allowed by each comparator set.
    // Use the equivalent release boundary for a prerelease neither set shares.
    if (!comparator.operator) return;
    comparators.push(
      new Comparator(
        `${comparator.operator.startsWith('>') ? '>=' : '<'}${base}`,
      ),
    );
  }

  const exact = comparators.find(({ operator, value }) => !operator && value);
  if (exact) {
    if (comparators.every((comparator) => comparator.test(exact.semver))) {
      return exact.value;
    }
    return;
  }

  let lower: Comparator | undefined;
  let upper: Comparator | undefined;
  for (const comparator of comparators) {
    if (
      comparator.operator.startsWith('>') &&
      (!lower || !comparator.test(lower.semver))
    ) {
      lower = comparator;
    }
    if (
      comparator.operator.startsWith('<') &&
      (!upper || !comparator.test(upper.semver))
    ) {
      upper = comparator;
    }
  }

  const intersection = new Range(
    [lower?.value, upper?.value].filter(Boolean).join(' '),
  );
  const minimum = minVersion(intersection);
  let hasMinimum = minimum !== null;
  if (minimum && minimum.patch > Number.MAX_SAFE_INTEGER) {
    // minVersion can increment an exclusive patch past semver's numeric limit.
    const nextRelease =
      minimum.minor === Number.MAX_SAFE_INTEGER
        ? `${minimum.major + 1}.0.0`
        : `${minimum.major}.${minimum.minor + 1}.0`;
    hasMinimum = intersection.test(nextRelease);
  }
  // minVersion advances an exclusive release bound to the next release.
  // An opted-in prerelease can still fit before that release.
  const upperBase = upper && prereleaseBase(upper);
  if (hasMinimum || (upperBase && intersection.test(`${upperBase}-0`))) {
    return intersection.range || '*';
  }
}

function intersectRanges(first: string, second: string): string | undefined {
  const left = new Range(first);
  const right = new Range(second);
  const comparatorOptions: RangeOptions = { includePrerelease: true };
  if (!left.intersects(right, comparatorOptions)) return;

  const alternatives = new Set<string>();
  for (const leftSet of left.set) {
    for (const rightSet of right.set) {
      const intersection = intersectComparatorSets(leftSet, rightSet);
      if (intersection !== undefined) alternatives.add(intersection);
    }
  }

  if (alternatives.size === 0) return;
  const intersection = [...alternatives].join(' || ');
  const normalized = new Range(intersection).range;
  if (normalized === left.range) return first;
  if (normalized === right.range) return second;
  return intersection;
}

export function collectComponentNpmDependencies(
  systemName: string,
  components: readonly ComponentDeclaration[],
  onInvalid?: (error: CliError) => void,
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
      try {
        if (name.length > 214 || !PACKAGE_NAME.test(name)) {
          throw new CliError(`${context} has an invalid npm package name.`);
        }
        if (!validRange(range)) {
          throw new CliError(
            `${context} must use a valid semver range. Received ${JSON.stringify(range)}.`,
          );
        }
        if (subset('*', range)) {
          throw new CliError(
            `${context} must declare a bounded semver range. Received ${JSON.stringify(range)}, which admits every version.`,
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

        const intersection = intersectRanges(requirement.range, range);
        if (intersection === undefined) {
          const conflict = [...requirement.declarations].find(
            ([otherRange]) => intersectRanges(otherRange, range) === undefined,
          );
          const competingRequirement = conflict
            ? `${JSON.stringify(conflict[0])} required by component ${JSON.stringify(conflict[1])}`
            : `the combined range ${JSON.stringify(requirement.range)} required by components ${[...requirement.components].map((name) => JSON.stringify(name)).join(', ')}`;
          throw new CliError(
            `${context} requires ${JSON.stringify(range)}, which conflicts with ${competingRequirement}.`,
          );
        }

        requirement.range = intersection;
        requirement.components.add(component.name);
        requirement.declarations.set(range, component.name);
      } catch (error) {
        if (!onInvalid || !(error instanceof CliError)) throw error;
        onInvalid(error);
      }
    }
  }

  return Array.from(packages, ([name, { range, components }]) => ({
    name,
    range,
    components: [...components],
  }));
}

function hasDeclaredPackage(
  section: unknown,
  name: string,
): section is Record<string, unknown> {
  return (
    section !== null &&
    typeof section === 'object' &&
    !Array.isArray(section) &&
    Object.hasOwn(section, name)
  );
}

export function classifyComponentNpmDependencies(
  requirements: readonly ComponentNpmDependency[],
  manifest: Readonly<Record<string, unknown>>,
): ClassifiedComponentNpmDependency[] {
  return requirements.map((requirement) => {
    const { name } = requirement;
    const nonSatisfyingSections = NON_SATISFYING_SECTIONS.filter((section) =>
      hasDeclaredPackage(manifest[section], name),
    );
    const definition = nonSatisfyingSections.length
      ? { ...requirement, nonSatisfyingSections }
      : requirement;

    // npm gives an optional declaration precedence over a same-name dependency.
    if (hasDeclaredPackage(manifest.optionalDependencies, name)) {
      return {
        ...definition,
        status: 'needs-attention',
        declaredRange: manifest.optionalDependencies[name],
      };
    }

    let declared = false;
    for (const section of DEPENDENCY_SECTIONS) {
      const dependencies = manifest[section];
      if (!hasDeclaredPackage(dependencies, name)) continue;

      declared = true;
      const declaredRange = dependencies[name];
      if (
        typeof declaredRange !== 'string' ||
        !validRange(declaredRange) ||
        !subset(declaredRange, requirement.range)
      ) {
        return { ...definition, status: 'needs-attention', declaredRange };
      }
    }

    return { ...definition, status: declared ? 'satisfied' : 'missing' };
  });
}
