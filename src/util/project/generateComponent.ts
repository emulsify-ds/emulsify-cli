import type { EmulsifyVariant } from '@emulsify-cli/config';
import type { CreateComponentHandlerOptions } from '@emulsify-cli/handlers';

import { select, confirm } from '@inquirer/prompts';
import { promises as fs } from 'fs';
import { dirname } from 'path';
import { pathExists, remove } from 'fs-extra';
import { cyan, green, bold, yellow } from 'colorette';

import log from '../../lib/log.js';
import findFileInCurrentPath from '../fs/findFileInCurrentPath.js';
import safeResolveWithin from '../fs/safeResolveWithin.js';
import { EMULSIFY_PROJECT_CONFIG_FILE } from '../../lib/constants.js';
import deriveComponentNames from '../deriveComponentNames.js';
import resolveComponentTemplate from './resolveComponentTemplate.js';
import type { ComponentTemplateVars } from './renderTemplate.js';
import {
  buildScssTemplate,
  buildSdcJsTemplate,
  buildSdcMetadataTemplate,
  buildSdcStoriesTemplate,
  buildStoriesTemplate,
  buildTwigTemplate,
  buildYmlTemplate,
} from './componentTemplates/index.js';

const COMPONENT_FORMAT_CHOICES = [
  {
    name: `${bold('Default')} (Standard Emulsify component)`,
    value: 'default',
  },
  {
    name: `${bold('SDC')} (Single Directory Component for Drupal)`,
    value: 'sdc',
  },
];

const COMPONENT_FORMATS = ['default', 'sdc'] as const;

type ComponentFormat = (typeof COMPONENT_FORMATS)[number];

type ComponentArtifact = {
  logicalName: string;
  destinationName: string;
  build: () => string;
};

/**
 * Validates and normalizes a component format option.
 *
 * @param format Raw format value provided by a CLI option.
 * @returns Normalized component format.
 * @throws {Error} if the format is not one of the supported component formats.
 */
function getComponentFormat(format: string): ComponentFormat {
  const normalizedFormat = format.toLowerCase();

  if (!COMPONENT_FORMATS.includes(normalizedFormat as ComponentFormat)) {
    throw new Error(
      `Invalid component format "${format}". Supported formats are: default, sdc.`,
    );
  }

  return normalizedFormat as ComponentFormat;
}

/**
 * Installs a specified component within the Emulsify project the user is currently within.
 *
 * @param variant EmulsifyVariant object containing information about the component, where it lives, and how it should be created.
 * @param componentName string name of the component that should be created.
 * @param options commander options object.
 * @param options.directory string name of the directory where the component should be created.
 * @param options.format component format to generate. Supported values are "default" and "sdc".
 * @param options.yes whether to skip overwrite confirmation prompts and replace existing components.
 * @param options.dryRun whether to preview generated files without changing the project.
 * @returns
 * @throws {Error} if the component name is invalid, the current path is not within an Emulsify project, the requested structure is invalid, or required non-interactive options are missing.
 */
export default async function generateComponent(
  variant: EmulsifyVariant,
  componentName: string,
  options: CreateComponentHandlerOptions = {},
): Promise<void> {
  const { filename, className, camelName, snakeName, humanName } =
    deriveComponentNames(componentName);
  const canPrompt = process.stdin.isTTY === true;
  const providedFormat = options.format
    ? getComponentFormat(options.format)
    : undefined;
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
  const format = providedFormat
    ? providedFormat
    : canPrompt
      ? await select({
          message: cyan('Choose the component format:'),
          choices: COMPONENT_FORMAT_CHOICES,
        })
      : (() => {
          throw new Error(
            'Component format is required in non-interactive mode. Pass --format default or --format sdc.',
          );
        })();

  // Choose the component's parent structure within the given variant configuration.
  if (!directory) {
    if (!canPrompt) {
      throw new Error(
        'Component directory is required in non-interactive mode. Pass --directory <directory>.',
      );
    }

    directory = await select({
      message: cyan('Choose a directory for the new component:'),
      choices: variant.structureImplementations.map((structure) => ({
        name: structure.name,
        value: structure.name,
      })),
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
    snakeName,
    humanName,
    directory,
    format,
  };
  const formatLabel = format.toUpperCase();
  const sharedArtifacts: ComponentArtifact[] = [
    {
      logicalName: 'component.twig',
      destinationName: `${filename}.twig`,
      build: () =>
        buildTwigTemplate(filename, snakeName, className, formatLabel),
    },
    {
      logicalName: 'component.scss',
      destinationName: `${filename}.scss`,
      build: () => buildScssTemplate(className, formatLabel),
    },
  ];
  const formatArtifacts: ComponentArtifact[] =
    format === 'sdc'
      ? [
          {
            logicalName: 'component.component.yml',
            destinationName: `${filename}.component.yml`,
            build: () => buildSdcMetadataTemplate(snakeName, humanName),
          },
          {
            logicalName: 'component.js',
            destinationName: `${filename}.js`,
            build: () => buildSdcJsTemplate(camelName, filename, className),
          },
          {
            logicalName: 'component.stories.js',
            destinationName: `${filename}.stories.js`,
            build: () =>
              buildSdcStoriesTemplate(
                camelName,
                filename,
                snakeName,
                humanName,
                directory,
              ),
          },
        ]
      : [
          {
            logicalName: 'component.yml',
            destinationName: `${filename}.yml`,
            build: () => buildYmlTemplate(snakeName, humanName),
          },
          {
            logicalName: 'component.stories.js',
            destinationName: `${filename}.stories.js`,
            build: () =>
              buildStoriesTemplate(camelName, filename, humanName, directory),
          },
        ];

  const artifacts = [...sharedArtifacts, ...formatArtifacts];
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
        `Format: ${format}`,
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
    const shouldReplace =
      options.yes ||
      (canPrompt
        ? await confirm({
            message: yellow(
              `The component "${humanName}" already exists in ${structure.directory}. Would you like to replace it?`,
            ),
            default: false,
          })
        : false);

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
        format,
        artifact.logicalName,
        templateVars,
      )) ?? artifact.build();
    const artifactDestination = artifactDestinations[index];

    await fs.writeFile(artifactDestination, templateFile);
  }

  return log(
    'success',
    `${bold(green('Success!'))} The ${bold(cyan(componentName))} component (${yellow(format.toUpperCase())}) has been created in ${bold(directory)}.`,
  );
}
