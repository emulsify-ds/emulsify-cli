/**
 * @file Builds Storybook stories templates for Drupal SDC components.
 */

/**
 * Generates the Storybook story file for a Drupal Single Directory Component.
 *
 * @param camelName JavaScript-safe camelCase component identifier.
 * @param filename Kebab-case component file and folder name.
 * @param snakeName Snake-case prefix used by the generated SDC props.
 * @param humanName Human-readable component name shown in Storybook.
 * @param directoryTitle Display-ready Storybook title group.
 * @returns JavaScript source content for the generated SDC Storybook story.
 */
export function buildSdcStoriesTemplate(
  camelName: string,
  filename: string,
  snakeName: string,
  humanName: string,
  directoryTitle: string,
): string {
  return `import ${camelName}Twig from './${filename}.twig';
import { props } from './${filename}.component.yml';
import './${filename}';

const ${camelName}Data = props.properties;

/**
 * Storybook Definition.
 */
export default { 
  title: '${directoryTitle}/${humanName}',
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
}
