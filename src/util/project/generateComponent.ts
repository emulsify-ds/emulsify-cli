import type { EmulsifyVariant } from '@emulsify-cli/config';

import { select, confirm } from '@inquirer/prompts';
import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { pathExists, remove } from 'fs-extra';
import { cyan, green, bold, yellow } from 'colorette';

import log from '../../lib/log.js';
import findFileInCurrentPath from '../fs/findFileInCurrentPath.js';
import { EMULSIFY_PROJECT_CONFIG_FILE } from '../../lib/constants.js';

const storiesTemplate = (
  componentName: string,
  filename: string,
  directory: string,
) =>
  `import ${componentName}Twig from './${filename}.twig';
import ${componentName}Data from './${filename}.yml';

/**
 * Storybook Definition.
 */
export default { title: '${directory[0].toUpperCase() + directory.slice(1)}/${
    componentName[0].toUpperCase() + componentName.slice(1)
  }' };

export const ${componentName} = () => ${componentName}Twig(${componentName}Data);
`;

const sdcStoriesTemplate = (
  componentName: string,
  filename: string,
  directory: string,
) =>
  `import ${componentName}Twig from './${filename}.twig';
import { props } from './${filename}.component.yml';
import './${filename}';

const ${componentName}Data = props.properties;

/**
 * Storybook Definition.
 */
export default { 
  title: '${directory[0].toUpperCase() + directory.slice(1)}/${
    componentName[0].toUpperCase() + componentName.slice(1)
  }',
  args: {
    heading: ${componentName}Data.${filename}__heading.data,
    content: ${componentName}Data.${filename}__content.data,
  },
};

export const ${componentName} = ({ heading, content }) => 
  ${componentName}Twig({
    ${filename}__heading: heading,
    ${filename}__content: content,
  });
`;

const twigTemplate = (filename: string, className: string, format: string) => {
  const label = format === 'DEFAULT' ? 'STANDARD' : format;
  return `{#
/**
 * @file
 * ${filename}.twig
 * Format: ${label}
 *
 * Available variables:
 * - ${filename}__heading - the content of the heading (UPPERCASE by default)
 * - ${filename}__content - the content of the component (typically text)
 * 
 * Available blocks:
 * - ${filename}__content - used to replace the content with something other than text
 *   for example: to insert an icon
 */
 #}
{% set ${filename}__base_class = '${className}' %}

<article class="${className}">
  <div class="${className}__badge">
    <span>${label}</span>
  </div>
  <div class="${className}__main">
    {% if ${filename}__heading %}
      <h2 class="${className}__heading">{{ ${filename}__heading }}</h2>
    {% endif %}
    {% block ${filename}__content %}
      <div class="${className}__content">
        {{ ${filename}__content }}
      </div>
    {% endblock %}
  </div>
</article>
`;
};

const scssTemplate = (className: string, format: string) => {
  const label = format === 'DEFAULT' ? 'STANDARD' : format;
  const isSdc = format === 'SDC';
  return `/*
 * Base Styles for ${className} (${label})
 *
 * These styles are provided as a professional starting point. 
 * Please replace or extend them to align with your project's 
 * unique design system and requirements.
 */
.${className} {
  position: relative;
  display: flex;
  min-height: 120px;
  border: 1px solid #e2e8f0;
  border-radius: 0.75rem;
  background-color: #ffffff;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  font-family: system-ui, -apple-system, sans-serif;
  overflow: hidden;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  margin: 1rem 2rem;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  }

  &__badge {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    background-color: ${isSdc ? '#2563eb' : '#f8fafc'};
    border-right: 1px solid #e2e8f0;
    flex-shrink: 0;

    span {
      transform: rotate(-90deg);
      white-space: nowrap;
      font-size: 10px;
      font-weight: 800;
      color: ${isSdc ? '#ffffff' : '#64748b'};
      text-transform: uppercase;
      letter-spacing: 0.15em;
    }
  }

  &__main {
    padding: 1.5rem 1.5rem 1.5rem 1.25rem;
    flex-grow: 1;
  }

  &__heading {
    margin: 0 0 1rem 0;
    font-size: 1.25rem;
    font-weight: 800;
    color: #1e293b;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    line-height: 1.2;
  }

  &__content {
    color: #475569;
    font-size: 1rem;
    line-height: 1.7;
  }
}
`;
};

const ymlTemplate = (filename: string, componentName: string) =>
  `${filename}__heading: '${componentName.toUpperCase()}'
${filename}__content: 'This is the content for the ${componentName} component, using the Standard Emulsify component pattern.'
`;

const sdcMetadataTemplate = (filename: string, componentName: string) =>
  `$schema: https://git.drupalcode.org/project/drupal/-/raw/11.x/core/modules/sdc/src/metadata.schema.json
name: ${componentName}
group: Custom
status: stable
props:
  type: object
  properties:
    ${filename}__heading:
      type: string
      title: Heading
      data: '${componentName.toUpperCase()}'
    ${filename}__content:
      type: string
      title: Content
      data: 'This is the content for the ${componentName} component, using the Single Directory Component pattern.'
`;

const sdcJsTemplate = (filename: string, className: string) =>
  `/**
 * @file
 * JavaScript for the ${filename} component.
 */
// eslint-disable-next-line
Drupal.behaviors.${filename} = {
  attach(context) {
    const elements = context.querySelectorAll('.${className}');
    elements.forEach((el) => {
      // eslint-disable-next-line
      console.log('${filename} component attached:', el);
    });
  },
};
`;

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

/**
 * Installs a specified component within the Emulsify project the user is currently within.
 *
 * @param variant EmulsifyVariant object containing information about the component, where it lives, and how it should be created.
 * @param componentName string name of the component that should be created.
 * @param componentDirectory string name of the directory where it should be created.
 * @returns
 */
export default async function generateComponent(
  variant: EmulsifyVariant,
  componentName: string,
  componentDirectory?: string,
): Promise<void> {
  let directory = componentDirectory || '';
  // Gather information about the current Emulsify project. If none exists,
  // throw an error.
  const path = findFileInCurrentPath(EMULSIFY_PROJECT_CONFIG_FILE);
  if (!path) {
    throw new Error(
      'Unable to find an Emulsify project to create the component into.',
    );
  }

  // Choose the component format.
  const format = await select({
    message: cyan('Choose the component format:'),
    choices: COMPONENT_FORMAT_CHOICES,
  });

  // Choose the component's parent structure within the given variant configuration.
  if (!directory) {
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
  const parentPath = join(dirname(path), structure.directory);
  if (!(await pathExists(parentPath))) {
    // Create the component's parent directory.
    await fs.mkdir(parentPath, { recursive: true });
  }

  // Calculate the destination path based on the path to the Emulsify project, the structure of the
  // component, and the component's name.
  const destination = join(dirname(path), structure.directory, componentName);

  // If the component already exists within the project,
  // ask the user if they want to replace it.
  const componentExists = await pathExists(destination);
  if (componentExists) {
    const shouldReplace = await confirm({
      message: yellow(
        `The component "${componentName}" already exists in ${structure.directory}. Would you like to replace it?`,
      ),
      default: false,
    });

    if (!shouldReplace) {
      return log('info', `Component creation canceled.`);
    }

    // Remove the existing component directory to ensure a clean start.
    await remove(destination);
  }

  const filename = componentName
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .toLowerCase();

  const className = componentName
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .toLowerCase();

  // Create the component directory
  await fs.mkdir(destination, { recursive: true });

  // Generate twig template file
  const twigTemplateFile = twigTemplate(
    filename,
    className,
    format.toUpperCase(),
  );
  const twigTemplatePath = join(destination, `${filename}.twig`);
  await fs.writeFile(twigTemplatePath, twigTemplateFile);

  // Generate scss template file
  const scssTemplateFile = scssTemplate(className, format.toUpperCase());
  const scssTemplatePath = join(destination, `${filename}.scss`);
  await fs.writeFile(scssTemplatePath, scssTemplateFile);

  if (format === 'sdc') {
    // SDC Specific files
    const metadataTemplateFile = sdcMetadataTemplate(filename, componentName);
    const metadataTemplatePath = join(destination, `${filename}.component.yml`);
    await fs.writeFile(metadataTemplatePath, metadataTemplateFile);

    const jsTemplateFile = sdcJsTemplate(filename, className);
    const jsTemplatePath = join(destination, `${filename}.js`);
    await fs.writeFile(jsTemplatePath, jsTemplateFile);

    const storiesTemplateFile = sdcStoriesTemplate(
      componentName,
      filename,
      directory,
    );
    const storiesTemplatePath = join(destination, `${filename}.stories.js`);
    await fs.writeFile(storiesTemplatePath, storiesTemplateFile);
  } else {
    // Default format files
    const ymlTemplateFile = ymlTemplate(filename, componentName);
    const ymlTemplatePath = join(destination, `${filename}.yml`);
    await fs.writeFile(ymlTemplatePath, ymlTemplateFile);

    const storiesTemplateFile = storiesTemplate(
      componentName,
      filename,
      directory,
    );
    const storiesTemplatePath = join(destination, `${filename}.stories.js`);
    await fs.writeFile(storiesTemplatePath, storiesTemplateFile);
  }

  return log(
    'success',
    `${bold(green('Success!'))} The ${bold(cyan(componentName))} component (${yellow(format.toUpperCase())}) has been created in ${bold(directory)}.`,
  );
}
