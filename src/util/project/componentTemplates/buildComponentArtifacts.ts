import type { ComponentType } from '../componentTypes.js';
import type { ComponentTemplateVars } from '../renderTemplate.js';

import { buildReactTemplate } from './react.js';
import { buildReactStoriesTemplate } from './reactStories.js';
import { buildScssTemplate } from './scss.js';
import { buildSdcJsTemplate } from './sdcJs.js';
import { buildSdcMetadataTemplate } from './sdcMetadata.js';
import { buildSdcStoriesTemplate } from './sdcStories.js';
import { buildStoriesTemplate } from './stories.js';
import { buildTwigTemplate } from './twig.js';
import { buildWebComponentTemplate } from './webComponent.js';
import { buildWebComponentStoriesTemplate } from './webComponentStories.js';
import { buildYmlTemplate } from './yml.js';

export type ComponentArtifact = {
  logicalName: string;
  destinationName: string;
  contents: string;
};

const token = (name: keyof ComponentTemplateVars): string => `{{ ${name} }}`;

/** Template variables that preserve every value as an editable override token. */
export const COMPONENT_TEMPLATE_TOKEN_VARS: ComponentTemplateVars = {
  filename: token('filename'),
  className: token('className'),
  camelName: token('camelName'),
  pascalName: token('pascalName'),
  snakeName: token('snakeName'),
  humanName: token('humanName'),
  directory: token('directory'),
  directoryTitle: token('directoryTitle'),
  format: token('format'),
  formatLabel: token('formatLabel'),
  type: token('type'),
  tagName: token('tagName'),
};

/**
 * Build the complete artifact set for one component type.
 *
 * Concrete variables produce generated component files. Token variables produce
 * editable override templates with the same logical artifact inventory.
 */
export default function buildComponentArtifacts(
  type: ComponentType,
  vars: ComponentTemplateVars,
): ComponentArtifact[] {
  const {
    filename,
    className,
    camelName,
    pascalName,
    snakeName,
    humanName,
    directoryTitle,
    formatLabel,
    tagName,
  } = vars;

  switch (type) {
    case 'twig':
      return [
        {
          logicalName: 'component.twig',
          destinationName: `${filename}.twig`,
          contents: buildTwigTemplate(
            filename,
            snakeName,
            className,
            formatLabel,
          ),
        },
        {
          logicalName: 'component.scss',
          destinationName: `${filename}.scss`,
          contents: buildScssTemplate(className, formatLabel),
        },
        {
          logicalName: 'component.yml',
          destinationName: `${filename}.yml`,
          contents: buildYmlTemplate(snakeName, humanName),
        },
        {
          logicalName: 'component.stories.js',
          destinationName: `${filename}.stories.js`,
          contents: buildStoriesTemplate(
            camelName,
            filename,
            humanName,
            directoryTitle,
          ),
        },
      ];
    case 'twig-sdc':
      return [
        {
          logicalName: 'component.twig',
          destinationName: `${filename}.twig`,
          contents: buildTwigTemplate(
            filename,
            snakeName,
            className,
            formatLabel,
          ),
        },
        {
          logicalName: 'component.scss',
          destinationName: `${filename}.scss`,
          contents: buildScssTemplate(className, formatLabel),
        },
        {
          logicalName: 'component.component.yml',
          destinationName: `${filename}.component.yml`,
          contents: buildSdcMetadataTemplate(snakeName, humanName),
        },
        {
          logicalName: 'component.js',
          destinationName: `${filename}.js`,
          contents: buildSdcJsTemplate(camelName, filename, className),
        },
        {
          logicalName: 'component.stories.js',
          destinationName: `${filename}.stories.js`,
          contents: buildSdcStoriesTemplate(
            camelName,
            filename,
            snakeName,
            humanName,
            directoryTitle,
          ),
        },
      ];
    case 'react':
      return [
        {
          logicalName: 'component.jsx',
          destinationName: `${filename}.jsx`,
          contents: buildReactTemplate(
            pascalName,
            filename,
            className,
            humanName,
          ),
        },
        {
          logicalName: 'component.scss',
          destinationName: `${filename}.scss`,
          contents: buildScssTemplate(className, formatLabel),
        },
        {
          logicalName: 'component.stories.jsx',
          destinationName: `${filename}.stories.jsx`,
          contents: buildReactStoriesTemplate(
            pascalName,
            filename,
            humanName,
            directoryTitle,
          ),
        },
      ];
    case 'web-component':
      return [
        {
          logicalName: 'component.js',
          destinationName: `${filename}.js`,
          contents: buildWebComponentTemplate(
            pascalName,
            filename,
            className,
            humanName,
            tagName,
          ),
        },
        {
          logicalName: 'component.scss',
          destinationName: `${filename}.scss`,
          contents: buildScssTemplate(className, formatLabel),
        },
        {
          logicalName: 'component.stories.js',
          destinationName: `${filename}.stories.js`,
          contents: buildWebComponentStoriesTemplate(
            filename,
            humanName,
            directoryTitle,
            tagName,
          ),
        },
      ];
  }
}

/** Build the editable logical templates for one component type. */
export function buildEjectableComponentTemplates(
  type: ComponentType,
): ComponentArtifact[] {
  return buildComponentArtifacts(type, COMPONENT_TEMPLATE_TOKEN_VARS);
}
