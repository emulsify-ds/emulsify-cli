import type {
  EmulsifyProjectConfiguration,
  EmulsifyVariant,
} from '@emulsify-cli/config';
import type { CreateComponentHandlerOptions } from '@emulsify-cli/handlers';

import { confirm, input, select } from '@inquirer/prompts';
import { promises as fs } from 'fs';
import { dirname } from 'path';
import { pathExists, remove } from 'fs-extra';

import log from '../../lib/log.js';
import getTerminalColors from '../../lib/terminalColors.js';
import findFileInCurrentPath from '../fs/findFileInCurrentPath.js';
import safeResolveWithin from '../fs/safeResolveWithin.js';
import { EMULSIFY_PROJECT_CONFIG_FILE } from '../../lib/constants.js';
import deriveComponentNames from '../deriveComponentNames.js';
import {
  assertValidCustomElementTagName,
  deriveCustomElementTagName,
} from '../deriveCustomElementTagName.js';
import { runPrompt } from '../prompt/index.js';
import {
  componentTypeFromLegacyFormat,
  getAvailableComponentTypes,
  getComponentFormatLabel,
  getCompatibleFormatToken,
  MISSING_COMPONENT_DIRECTORY_ERROR,
  MISSING_COMPONENT_TYPE_ERROR,
  normalizeComponentType,
  projectDeclaresEmulsifyCore,
  type ComponentType,
} from './componentTypes.js';
import resolveComponentTemplate from './resolveComponentTemplate.js';
import type { ComponentTemplateVars } from './renderTemplate.js';
import { buildComponentArtifacts } from './componentTemplates/index.js';

const TYPE_LABELS: Record<ComponentType, string> = {
  twig: 'Twig',
  'twig-sdc': 'Twig SDC',
  react: 'React',
  'web-component': 'Web Component',
};

function resolveProvidedComponentType(
  options: CreateComponentHandlerOptions,
): ComponentType | undefined {
  if (options.type) {
    const type = normalizeComponentType(options.type);
    if (options.format) {
      log(
        'warn',
        `The --format option is deprecated and was ignored because --type ${type} was also provided.`,
      );
    }
    return type;
  }

  if (!options.format) return undefined;

  const type = componentTypeFromLegacyFormat(options.format);
  log('warn', `The --format option is deprecated; use --type ${type} instead.`);
  return type;
}

async function promptForComponentType(
  projectRoot: string,
  platform: EmulsifyProjectConfiguration['project']['platform'],
  bold: (value: string) => string,
  cyan: (value: string) => string,
): Promise<ComponentType> {
  const hasEmulsifyCore = await projectDeclaresEmulsifyCore(projectRoot);
  const availableTypes = getAvailableComponentTypes(platform, hasEmulsifyCore);

  if (platform !== 'drupal') {
    log(
      'info',
      'Twig SDC is available only for Drupal projects, so it is not shown.',
    );
  }
  if (!hasEmulsifyCore) {
    log(
      'info',
      "React and Web Component are not shown because @emulsify/core is not declared in this project's package.json. Pass --type explicitly to scaffold either one anyway.",
    );
  }

  if (availableTypes.length === 1) {
    log('info', 'Using Twig, the only detected compatible component type.');
    return 'twig';
  }

  const descriptions: Record<ComponentType, string> = {
    twig: 'Twig template with YAML data and a Storybook story',
    'twig-sdc': 'Drupal Single Directory Component built with Twig',
    react: "React component using Storybook's standard React support",
    'web-component': 'Custom element rendered by @emulsify/core',
  };

  return select<ComponentType>({
    message: cyan('Choose the component type:'),
    choices: availableTypes.map((type) => ({
      name: bold(TYPE_LABELS[type]),
      value: type,
      description: descriptions[type],
    })),
  });
}

function validateCustomElementTagName(value: string): true | string {
  try {
    assertValidCustomElementTagName(value.trim());
    return true;
  } catch (error) {
    return (error as Error).message;
  }
}

/**
 * Generates a specified component within the current Emulsify project.
 *
 * @param variant EmulsifyVariant object containing information about the component, where it lives, and how it should be created.
 * @param projectConfig current Emulsify project configuration.
 * @param componentName string name of the component that should be created.
 * @param options commander options object.
 * @param options.directory string name of the directory where the component should be created.
 * @param options.type canonical component type to generate.
 * @param options.format deprecated component format alias. "default" maps to "twig" and "sdc" maps to "twig-sdc".
 * @param options.yes whether to skip overwrite confirmation prompts and replace existing components.
 * @param options.dryRun whether to preview generated files without changing the project.
 * @returns
 * @throws {Error} if the component name is invalid, the current path is not within an Emulsify project, the requested structure is invalid, or required non-interactive options are missing.
 */
export default async function generateComponent(
  variant: EmulsifyVariant,
  projectConfig: EmulsifyProjectConfiguration,
  componentName: string,
  options: CreateComponentHandlerOptions = {},
): Promise<void> {
  const { bold, cyan, green, yellow } = getTerminalColors();
  const { filename, className, camelName, pascalName, snakeName, humanName } =
    deriveComponentNames(componentName);
  const providedType = resolveProvidedComponentType(options);
  let directory = options.directory || '';

  // Gather information about the current Emulsify project. If none exists,
  // throw an error.
  const path = findFileInCurrentPath(EMULSIFY_PROJECT_CONFIG_FILE);
  if (!path) {
    throw new Error(
      'Unable to find an Emulsify project to create the component into.',
    );
  }
  const projectRoot = dirname(path);

  // Prompts are only used for interactive TTY sessions; CI must provide flags so
  // the command never waits for input it cannot receive.
  const type = providedType
    ? providedType
    : await runPrompt({
        prompt: () =>
          promptForComponentType(
            projectRoot,
            projectConfig.project.platform,
            bold,
            cyan,
          ),
        nonInteractive: { error: MISSING_COMPONENT_TYPE_ERROR },
      });

  if (
    providedType &&
    (type === 'react' || type === 'web-component') &&
    !(await projectDeclaresEmulsifyCore(projectRoot))
  ) {
    log(
      'warn',
      `@emulsify/core was not detected in this project's package.json. The generated ${type} component may require installing @emulsify/core before its Storybook story can run.`,
    );
  }

  let tagName = '';
  if (type === 'web-component') {
    const derivedTagName = deriveCustomElementTagName(
      filename,
      projectConfig.project.machineName,
    );
    tagName = (
      await runPrompt({
        prompt: () =>
          input({
            message: cyan('Custom element tag name:'),
            default: derivedTagName,
            validate: validateCustomElementTagName,
          }),
        nonInteractive: { value: derivedTagName },
      })
    ).trim();
    assertValidCustomElementTagName(tagName);
  }

  // Choose the component's parent structure within the given variant configuration.
  if (!directory) {
    directory = await runPrompt({
      prompt: () =>
        select({
          message: cyan('Choose a directory for the new component:'),
          choices: variant.structureImplementations.map((structure) => ({
            name: structure.name,
            value: structure.name,
          })),
        }),
      nonInteractive: {
        error: MISSING_COMPONENT_DIRECTORY_ERROR,
      },
    });
  }

  // Find the component's parent structure within the given variant configuration. If the
  // component's parent structure does not exist, throw an error.
  const structure = variant.structureImplementations.find(
    ({ name }) => name === directory,
  );
  if (!structure) {
    throw new Error(
      `The structure (${directory}) specified within the component ${componentName} is invalid.`,
    );
  }

  const directoryTitle = `${directory.charAt(0).toUpperCase()}${directory.slice(1)}`;
  const formatLabel = getComponentFormatLabel(type);

  // Calculate the parent path based on the path to the Emulsify project and the component's structure.
  const parentPath = safeResolveWithin(
    projectRoot,
    structure.directory,
    'Component structure directory',
    { allowRoot: true },
  );
  const parentExists = await pathExists(parentPath);

  // Calculate the destination path (always kebab-case folder name).
  const destination = safeResolveWithin(
    projectRoot,
    [structure.directory, filename],
    'Component destination',
  );

  // If the component already exists within the project,
  // ask the user if they want to replace it.
  const componentExists = await pathExists(destination);
  const templateVars: ComponentTemplateVars = {
    filename,
    className,
    camelName,
    pascalName,
    snakeName,
    humanName,
    directory,
    directoryTitle,
    format: getCompatibleFormatToken(type),
    formatLabel,
    type,
    tagName,
  };
  const artifacts = buildComponentArtifacts(type, templateVars);
  const artifactDestinations = artifacts.map((artifact) =>
    safeResolveWithin(
      projectRoot,
      [structure.directory, filename, artifact.destinationName],
      'Component file destination',
    ),
  );

  if (options.dryRun) {
    const realRunAction = componentExists
      ? options.yes
        ? 'replace the existing component directory'
        : 'prompt before replacing the existing component directory'
      : 'create the component directory';
    const generatedFiles = artifactDestinations
      .map((filePath) => `  - ${filePath}`)
      .join('\n');

    return log(
      'info',
      [
        `Dry run: component create "${filename}"`,
        `Type: ${type}`,
        `Directory: ${directory}`,
        `Structure path: ${structure.directory}`,
        `Parent directory: ${parentPath} (${parentExists ? 'exists' : 'would be created'})`,
        `Destination: ${destination}`,
        `Destination exists: ${componentExists ? 'yes' : 'no'}`,
        `Real run would: ${realRunAction}`,
        'Generated files:',
        generatedFiles,
        'No files were written, removed, or created.',
      ].join('\n'),
    );
  }

  if (!parentExists) {
    // Create the component's parent directory.
    await fs.mkdir(parentPath, { recursive: true });
  }

  if (componentExists) {
    const shouldReplace = await runPrompt({
      prompt: () =>
        confirm({
          message: yellow(
            `The component "${humanName}" already exists in ${structure.directory}. Would you like to replace it?`,
          ),
          default: false,
        }),
      nonInteractive: { value: false },
      accept: { when: options.yes === true, value: true },
    });

    if (!shouldReplace) {
      return log('info', `Component creation canceled.`);
    }

    // Remove the existing component directory to ensure a clean start.
    await remove(destination);
  }

  // Create the component directory
  await fs.mkdir(destination, { recursive: true });

  for (const [index, artifact] of artifacts.entries()) {
    // Resolve a project override first; missing or empty overrides fall back to
    // the byte-for-byte built-in builders for each known generated artifact.
    const templateFile =
      (await resolveComponentTemplate(
        projectRoot,
        type,
        artifact.logicalName,
        templateVars,
      )) ?? artifact.contents;
    const artifactDestination = artifactDestinations[index];

    await fs.writeFile(artifactDestination, templateFile);
  }

  return log(
    'success',
    `${bold(green('Success!'))} The ${bold(cyan(componentName))} component (${yellow(TYPE_LABELS[type].toUpperCase())}) has been created in ${bold(directory)}.`,
  );
}
