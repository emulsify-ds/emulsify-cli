/**
 * @file Builds Storybook stories templates for standard generated components.
 */

/**
 * Generates the Storybook story file for a standard Emulsify component.
 *
 * @param camelName JavaScript-safe camelCase component identifier.
 * @param filename Kebab-case component file and folder name.
 * @param humanName Human-readable component name shown in Storybook.
 * @param directory Component structure name used as the Storybook title group.
 * @returns JavaScript source content for the generated standard Storybook story.
 */
export function buildStoriesTemplate(
  camelName: string,
  filename: string,
  humanName: string,
  directory: string,
): string {
  return `import ${camelName}Twig from './${filename}.twig';
import ${camelName}Data from './${filename}.yml';

/**
 * Storybook Definition.
 */
export default { title: '${directory[0].toUpperCase() + directory.slice(1)}/${humanName}' };

export const ${camelName} = () => ${camelName}Twig(${camelName}Data);
`;
}
