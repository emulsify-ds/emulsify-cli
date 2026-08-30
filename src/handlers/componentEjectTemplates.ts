import type { EjectComponentTemplatesHandlerOptions } from '@emulsify-cli/handlers';

import { checkbox } from '@inquirer/prompts';
import { promises as fs } from 'fs';
import { dirname } from 'path';
import { pathExists } from 'fs-extra';

import CliError from '../lib/CliError.js';
import {
  EMULSIFY_PROJECT_CONFIG_FILE,
  EMULSIFY_PROJECT_TEMPLATES_FOLDER,
} from '../lib/constants.js';
import log from '../lib/log.js';
import findFileInCurrentPath from '../util/fs/findFileInCurrentPath.js';
import safeResolveWithin from '../util/fs/safeResolveWithin.js';
import {
  COMPONENT_TYPES,
  normalizeComponentType,
  type ComponentType,
} from '../util/project/componentTypes.js';
import { buildEjectableComponentTemplates } from '../util/project/componentTemplates/index.js';
import { requireInteractiveTerminal, runPrompt } from '../util/prompt/index.js';

export const MISSING_TEMPLATE_TYPE_ERROR =
  'Component template selection is required in non-interactive mode. Pass the [type] positional argument (twig, twig-sdc, react, or web-component), or pass --all.';
export const CONFLICTING_TEMPLATE_TYPE_ERROR =
  'Pass either the [type] positional argument or --all, not both.';

const TYPE_CHOICES: {
  name: string;
  value: ComponentType;
  description: string;
}[] = [
  {
    name: 'Twig',
    value: 'twig',
    description: 'Twig markup, SCSS, YAML data, and a Storybook story',
  },
  {
    name: 'Twig SDC',
    value: 'twig-sdc',
    description: 'Drupal Single Directory Component templates',
  },
  {
    name: 'React',
    value: 'react',
    description: 'React JSX, SCSS, and a standard Storybook story',
  },
  {
    name: 'Web Component',
    value: 'web-component',
    description: 'Custom element, SCSS, and an Emulsify Core story',
  },
];

export type ComponentTemplateEjectionPlanItem = {
  type: ComponentType;
  logicalName: string;
  destination: string;
  contents: string;
};

type InspectedPlanItem = ComponentTemplateEjectionPlanItem & {
  exists: boolean;
};

/** Resolve every ejection target within the project's template directory. */
export function buildComponentTemplateEjectionPlan(
  projectRoot: string,
  types: readonly ComponentType[],
): ComponentTemplateEjectionPlanItem[] {
  const templatesRoot = safeResolveWithin(
    projectRoot,
    EMULSIFY_PROJECT_TEMPLATES_FOLDER,
    'Component templates directory',
  );

  return types.flatMap((type) => {
    // Validate the user-controlled path segment before asking for its artifact
    // inventory. Each write destination is guarded again below.
    safeResolveWithin(templatesRoot, type, 'Component template type directory');

    return buildEjectableComponentTemplates(type).map(
      ({ logicalName, contents }) => ({
        type,
        logicalName,
        destination: safeResolveWithin(
          templatesRoot,
          [type, logicalName],
          'Component template destination',
        ),
        contents,
      }),
    );
  });
}

function normalizeRequestedType(type: string): ComponentType {
  try {
    return normalizeComponentType(type);
  } catch (error) {
    throw new CliError(error instanceof Error ? error.message : String(error));
  }
}

function canonicalizeSelectedTypes(
  selectedTypes: readonly ComponentType[],
): ComponentType[] {
  const selected = new Set(selectedTypes);
  return COMPONENT_TYPES.filter((type) => selected.has(type));
}

async function inspectPlan(
  plan: ComponentTemplateEjectionPlanItem[],
): Promise<InspectedPlanItem[]> {
  return Promise.all(
    plan.map(async (item) => ({
      ...item,
      exists: await pathExists(item.destination),
    })),
  );
}

function getDryRunAction(exists: boolean, force: boolean): string {
  if (!exists) return 'would create';
  if (force) return 'would replace';
  return 'conflict; a real run requires --force';
}

function logDryRun(
  types: ComponentType[],
  plan: InspectedPlanItem[],
  force: boolean,
): void {
  const destinations = plan
    .map(
      ({ destination, exists }) =>
        `  - ${destination} (${getDryRunAction(exists, force)})`,
    )
    .join('\n');

  log(
    'info',
    [
      'Dry run: component eject-templates',
      `Types: ${types.join(', ')}`,
      'Template files:',
      destinations,
      'No files were written or replaced.',
    ].join('\n'),
  );
}

function formatConflictError(conflicts: InspectedPlanItem[]): string {
  const paths = conflicts
    .map(({ destination }) => `  - ${destination}`)
    .join('\n');

  return [
    'Refusing to overwrite existing component template files:',
    paths,
    'Pass --force to replace the conflicting templates. No files were written.',
  ].join('\n');
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isAlreadyExistsError(error: unknown): boolean {
  return (
    error !== null &&
    typeof error === 'object' &&
    'code' in error &&
    error.code === 'EEXIST'
  );
}

/** Handler for `emulsify component eject-templates [type]`. */
export default async function componentEjectTemplates(
  type: string | void,
  {
    all = false,
    force = false,
    dryRun = false,
  }: EjectComponentTemplatesHandlerOptions = {},
): Promise<void> {
  const requestedType = type?.trim();

  if (requestedType && all) {
    throw new CliError(CONFLICTING_TEMPLATE_TYPE_ERROR);
  }

  // CI must name the target before project lookup or any other work.
  if (!requestedType && !all) {
    requireInteractiveTerminal(MISSING_TEMPLATE_TYPE_ERROR);
  }

  const projectConfigPath = findFileInCurrentPath(EMULSIFY_PROJECT_CONFIG_FILE);
  if (!projectConfigPath) {
    throw new CliError(
      'No Emulsify project detected. Run this command within an existing Emulsify project.',
    );
  }
  const projectRoot = dirname(projectConfigPath);

  let selectedTypes: readonly ComponentType[];
  if (all) {
    selectedTypes = COMPONENT_TYPES;
  } else if (requestedType) {
    selectedTypes = [normalizeRequestedType(requestedType)];
  } else {
    selectedTypes = await runPrompt<ComponentType[]>({
      prompt: () =>
        checkbox<ComponentType>({
          message: 'Which component template types should be ejected?',
          choices: TYPE_CHOICES,
          validate: (values) =>
            values.length > 0 || 'Select at least one component type.',
        }),
      nonInteractive: { error: MISSING_TEMPLATE_TYPE_ERROR },
    });
  }
  const canonicalTypes = canonicalizeSelectedTypes(selectedTypes);
  if (canonicalTypes.length === 0) {
    throw new CliError('Select at least one component type.');
  }

  const inspectedPlan = await inspectPlan(
    buildComponentTemplateEjectionPlan(projectRoot, canonicalTypes),
  );
  const conflicts = inspectedPlan.filter(({ exists }) => exists);

  if (dryRun) {
    logDryRun(canonicalTypes, inspectedPlan, force);
    return;
  }

  if (conflicts.length > 0 && !force) {
    throw new CliError(formatConflictError(conflicts));
  }

  for (const item of inspectedPlan) {
    try {
      await fs.mkdir(dirname(item.destination), { recursive: true });
      await fs.writeFile(item.destination, item.contents, {
        encoding: 'utf-8',
        flag: force ? 'w' : 'wx',
      });
    } catch (error) {
      if (!force && isAlreadyExistsError(error)) {
        throw new CliError(
          `Component template "${item.destination}" appeared after the overwrite check and was not replaced. Pass --force to replace existing templates.`,
        );
      }

      throw new CliError(
        `Unable to write component template "${item.destination}": ${getErrorMessage(error)}`,
      );
    }
  }

  const paths = inspectedPlan
    .map(({ destination }) => `  - ${destination}`)
    .join('\n');
  log(
    'success',
    `Ejected ${inspectedPlan.length} built-in component templates:\n${paths}`,
  );
  log(
    'info',
    'Edit these files to customize component create. Delete an override to restore its built-in template.',
  );
}
