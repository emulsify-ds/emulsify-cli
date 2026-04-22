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
  camelName: string,
  filename: string,
  humanName: string,
  directory: string,
) =>
  `import ${camelName}Twig from './${filename}.twig';
import ${camelName}Data from './${filename}.yml';

/**
 * Storybook Definition.
 */
export default { title: '${directory[0].toUpperCase() + directory.slice(1)}/${humanName}' };

export const ${camelName} = () => ${camelName}Twig(${camelName}Data);
`;

const sdcStoriesTemplate = (
  camelName: string,
  filename: string,
  snakeName: string,
  humanName: string,
  directory: string,
) =>
  `import ${camelName}Twig from './${filename}.twig';
import { props } from './${filename}.component.yml';
import './${filename}';

const ${camelName}Data = props.properties;

/**
 * Storybook Definition.
 */
export default { 
  title: '${directory[0].toUpperCase() + directory.slice(1)}/${humanName}',
  args: {
    heading: ${camelName}Data.${snakeName}__heading.data,
    content: ${camelName}Data.${snakeName}__content.data,
  },
};

export const ${camelName} = ({ heading, content }) => 
  ${camelName}Twig({
    ${snakeName}__heading: heading,
    ${snakeName}__content: content,
  });
`;

const twigTemplate = (
  filename: string,
  snakeName: string,
  className: string,
  format: string,
) => {
  const label = format === 'DEFAULT' ? 'STANDARD' : format;
  return `{#
/**
 * @file
 * ${filename}.twig
 * Format: ${label}
 *
 * Available variables:
 * - ${snakeName}__heading - the heading text for this component
 * - ${snakeName}__content - the body content of this component (typically text)
 *
 * Available blocks:
 * - ${snakeName}__content - override the content area with custom markup,
 *   for example: to embed an image or icon
 */
 #}
{% set ${snakeName}__base_class = '${className}' %}

<article class="{{ ${snakeName}__base_class }}">
  {% if ${snakeName}__heading %}
    <h2 class="{{ ${snakeName}__base_class }}__heading">{{ ${snakeName}__heading }}</h2>
  {% endif %}
  {% block ${snakeName}__content %}
    <div class="{{ ${snakeName}__base_class }}__content">
      {{ ${snakeName}__content }}
    </div>
  {% endblock %}
</article>
`;
};

const scssTemplate = (className: string, format: string) => {
  const label = format === 'DEFAULT' ? 'STANDARD' : format;
  return `/*
 * Base Styles for ${className} (${label})
 *
 * These styles are provided as a starting point.
 * Replace or extend them to match your project's design system.
 */
.${className} {
  font-family: system-ui, -apple-system, sans-serif;
  width: 100%;
  max-width: 85ch;
  margin: 4rem auto;
}

.${className}__heading {
  margin: 0 0 0.75rem 0;
  font-size: 2.2rem;
  font-weight: 600;
  color: #1e293b;
  line-height: 1.3;
}

.${className}__content {
  color: #475569;
  font-size: 1rem;
  line-height: 1.7;
}
`;
};

const ymlTemplate = (filename: string, humanName: string) =>
  `${filename}__heading: '${humanName} Component'
${filename}__content: 'This is the content area of the ${humanName} component, created using the standard Emulsify format. Replace with your markup and data.'
`;

const sdcMetadataTemplate = (snakeName: string, humanName: string) =>
  `$schema: https://git.drupalcode.org/project/drupal/-/raw/11.x/core/modules/sdc/src/metadata.schema.json
name: ${humanName}
group: Custom
status: stable
props:
  type: object
  properties:
    ${snakeName}__heading:
      type: string
      title: Heading
      data: '${humanName} Component'
    ${snakeName}__content:
      type: string
      title: Content
      data: 'This is the content area of the ${humanName} component, created using the Single Directory Component (SDC) format for Drupal. Replace with your markup and data.'
`;

const sdcJsTemplate = (
  camelName: string,
  filename: string,
  className: string,
) =>
  `/**
 * @file
 * JavaScript for the ${filename} component.
 */
// eslint-disable-next-line
Drupal.behaviors.${camelName} = {
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

  // Derive all name variants from componentName up-front so every part of the
  // function (including the overwrite prompt) can use the correct form.

  // kebab-case filename: featuredItem → featured-item, featured-item → featured-item
  const filename = componentName
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .toLowerCase();

  // CSS class name is the same as the filename (kebab-case).
  const className = filename;

  // camelCase identifier for JS variables (featured-item → featuredItem).
  const camelName = filename.replace(/-([a-z])/g, (_, c: string) =>
    c.toUpperCase(),
  );

  // snake_case for YAML prop keys (featured-item → featured_item).
  const snakeName = filename.replace(/-/g, '_');

  // Human-readable title (featured-item → Featured Item).
  const humanName = filename
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  // Calculate the destination path (always kebab-case folder name).
  const destination = join(dirname(path), structure.directory, filename);

  // If the component already exists within the project,
  // ask the user if they want to replace it.
  const componentExists = await pathExists(destination);
  if (componentExists) {
    const shouldReplace = await confirm({
      message: yellow(
        `The component "${humanName}" already exists in ${structure.directory}. Would you like to replace it?`,
      ),
      default: false,
    });

    if (!shouldReplace) {
      return log('info', `Component creation canceled.`);
    }

    // Remove the existing component directory to ensure a clean start.
    await remove(destination);
  }

  // Create the component directory
  await fs.mkdir(destination, { recursive: true });

  // Generate twig template file
  const twigTemplateFile = twigTemplate(
    filename,
    snakeName,
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
    const metadataTemplateFile = sdcMetadataTemplate(snakeName, humanName);
    const metadataTemplatePath = join(destination, `${filename}.component.yml`);
    await fs.writeFile(metadataTemplatePath, metadataTemplateFile);

    const jsTemplateFile = sdcJsTemplate(camelName, filename, className);
    const jsTemplatePath = join(destination, `${filename}.js`);
    await fs.writeFile(jsTemplatePath, jsTemplateFile);

    const storiesTemplateFile = sdcStoriesTemplate(
      camelName,
      filename,
      snakeName,
      humanName,
      directory,
    );
    const storiesTemplatePath = join(destination, `${filename}.stories.js`);
    await fs.writeFile(storiesTemplatePath, storiesTemplateFile);
  } else {
    // Default format files
    const ymlTemplateFile = ymlTemplate(snakeName, humanName);
    const ymlTemplatePath = join(destination, `${filename}.yml`);
    await fs.writeFile(ymlTemplatePath, ymlTemplateFile);

    const storiesTemplateFile = storiesTemplate(
      camelName,
      filename,
      humanName,
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
