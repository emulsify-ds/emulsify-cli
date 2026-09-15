import type { Components } from '@emulsify-cli/config';
import type { ListComponentHandlerOptions } from '@emulsify-cli/handlers';
import { note } from '../lib/session.js';
import { withEmulsifySystem } from './hofs/withEmulsifySystem.js';

/**
 * Render a count with the right plural form.
 *
 * @param count number of things.
 * @param singular singular noun.
 * @returns the count followed by the correctly pluralized noun.
 */
function pluralize(count: number, singular: string): string {
  return `${count} ${count === 1 ? singular : `${singular}s`}`;
}

/**
 * Group the variant's components by the structure they belong to.
 *
 * @param components every component the variant offers.
 * @returns structure names mapped to their components, in declaration order.
 */
function groupByStructure(components: Components): Map<string, Components> {
  const groups = new Map<string, Components>();

  for (const component of components) {
    const group = groups.get(component.structure);

    if (group) {
      group.push(component);
      continue;
    }

    groups.set(component.structure, [component]);
  }

  return groups;
}

/**
 * Render the variant's components as an aligned, grouped block.
 *
 * @remarks The system already records which components are required and what
 * each one depends on. Showing both turns a flat list of names into something
 * you can plan an install from.
 *
 * @param components every component the variant offers.
 * @returns a multi-line block grouped by structure.
 */
export function formatComponentList(components: Components): string {
  if (components.length === 0) {
    return 'This variant offers no components.';
  }

  const nameWidth = Math.max(...components.map(({ name }) => name.length));
  const lines: string[] = [];

  for (const [structure, group] of groupByStructure(components)) {
    const requiredCount = group.filter(({ required }) => required).length;
    const heading = [
      structure,
      pluralize(group.length, 'component'),
      ...(requiredCount > 0 ? [`${requiredCount} required`] : []),
    ].join('  ·  ');

    if (lines.length > 0) {
      lines.push('');
    }

    lines.push(heading);

    for (const { name, required, dependency } of group) {
      const notes = [
        ...(required ? ['required'] : []),
        ...(dependency && dependency.length > 0
          ? [`needs ${dependency.join(', ')}`]
          : []),
      ];

      lines.push(
        `  ${name.padEnd(nameWidth)}  ${notes.join('  ·  ')}`.trimEnd(),
      );
    }
  }

  return lines.join('\n');
}

/**
 * Handler for the `component list` command.
 *
 * @param options.refresh whether to check the system remote before reusing its cache entry.
 * @returns a short summary of what the installed variant offers.
 * @throws {CliError} if the current project does not have a usable system and variant configuration.
 */
export default async function componentList({
  refresh,
}: ListComponentHandlerOptions = {}): Promise<string> {
  // Load the configured system and variant before printing available components.
  const { variantConf } = await withEmulsifySystem('list components', {
    refresh,
  });

  const { components } = variantConf;

  note(formatComponentList(components), 'Available components');

  const structureCount = groupByStructure(components).size;

  return `${pluralize(components.length, 'component')} across ${pluralize(
    structureCount,
    'structure',
  )}`;
}
