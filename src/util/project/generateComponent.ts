import * as fs from 'fs';
import { pathExists } from 'fs-extra';
import type { EmulsifyVariant, StructureResponse } from '@emulsify-cli/config';
import { join, dirname } from 'path';
import { EMULSIFY_PROJECT_CONFIG_FILE } from '../../lib/constants';
import findFileInCurrentPath from '../fs/findFileInCurrentPath';
import log from '../../lib/log';
import inquirer, { QuestionCollection } from 'inquirer';

const storiesTemplate = (
  componentName: string,
  filename: string,
  directory: string
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

const twigTemplate = (filename: string, className: string) =>
  `{#
/**
 * Available variables:
 * - ${filename}__heading - the content of the heading (typically text)
 * - ${filename}__content - the content of the component (typically text)
 * 
 * Available blocks:
 * - ${filename}__content - used to replace the content of the button with something other than text
 *   for example: to insert an icon
 */
#}
{% set ${filename}__base_class = '${className}' %}

<div className="${filename}">
  {{ ${filename}__heading }}
  {% block ${filename}__content %}
    {# Component content goes here #}
    {{ ${filename}__content }}
  {% endblock %}
</div>
`;

const scssTemplate = (className: string) =>
  `.${className} {
  // Your SCSS code goes here
}
`;

const ymlTemplate = (filename: string, componentName: string) =>
  `${filename}__heading: '${componentName}'
${filename}__content: 'It is a descriptive text of the ${componentName} component'
`;

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
  componentDirectory?: string
): Promise<void> {
  let directory = componentDirectory || '';
  // Gather information about the current Emulsify project. If none exists,
  // throw an error.
  const path = findFileInCurrentPath(EMULSIFY_PROJECT_CONFIG_FILE);
  if (!path) {
    throw new Error(
      'Unable to find an Emulsify project to create the component into.'
    );
  }

  // Choose the component's parent structure within the given variant configuration.
  if (!directory) {
    const structureSelector: QuestionCollection = {
      type: 'list',
      name: 'structure',
      message: 'Choose a directory for the new component:',
      choices: variant.structureImplementations,
    };

    const response = await inquirer.prompt<StructureResponse>(
      structureSelector
    );
    directory = response.structure;
  }

  // Find the component's parent structure within the given variant configuration. If the
  // component's parent structure does not exist, throw an error.
  const structure = variant.structureImplementations.find(
    ({ name }) => name === directory
  );
  if (!structure) {
    throw new Error(
      `The structure (${directory}) specified within the component ${componentName} is invalid.`
    );
  }

  // Calculate the parent path based on the path to the Emulsify project and the component's structure.
  const parentPath = join(dirname(path), structure.directory);
  if (!(await pathExists(parentPath))) {
    // Create the component's parent directory.
    fs.mkdirSync(parentPath);
  }

  // Calculate the destination path based on the path to the Emulsify project, the structure of the
  // component, and the component's name.
  const destination = join(dirname(path), structure.directory, componentName);

  // If the component already exists within the project,
  // throw an error.
  if (await pathExists(destination)) {
    throw new Error(`The component already exists in ${structure.directory}`);
  }

  const filename = componentName
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .toLowerCase();

  const className = componentName
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .toLowerCase();

  // Create the component directory
  fs.mkdirSync(destination);

  // Generate twig template file
  const twigTemplateFile = twigTemplate(filename, className);
  const twigTemplatePath = join(destination, `${filename}.twig`);
  fs.writeFileSync(twigTemplatePath, twigTemplateFile);

  // Generate yml template file
  const ymlTemplateFile = ymlTemplate(filename, componentName);
  const ymlTemplatePath = join(destination, `${filename}.yml`);
  fs.writeFileSync(ymlTemplatePath, ymlTemplateFile);

  // Generate scss template file
  const scssTemplateFile = scssTemplate(className);
  const scssTemplatePath = join(destination, `${filename}.scss`);
  fs.writeFileSync(scssTemplatePath, scssTemplateFile);

  // Generate stories template file
  const storiesTemplateFile = storiesTemplate(
    componentName,
    filename,
    directory
  );
  const storiesTemplatePath = join(destination, `${filename}.stories.js`);
  fs.writeFileSync(storiesTemplatePath, storiesTemplateFile);

  return log(
    'success',
    `The ${componentName} component has been created in ${structure.directory}`
  );
}
