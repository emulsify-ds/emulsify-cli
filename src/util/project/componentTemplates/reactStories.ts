/**
 * @file Builds Storybook stories for generated React components.
 */

/**
 * Generates a CSF story using Storybook's standard React component support.
 *
 * @param pascalName PascalCase JavaScript component identifier.
 * @param filename Kebab-case component file and folder name.
 * @param humanName Human-readable component name shown in Storybook.
 * @param directoryTitle Display-ready Storybook title group.
 * @returns JSX source content for the generated React Storybook story.
 */
export function buildReactStoriesTemplate(
  pascalName: string,
  filename: string,
  humanName: string,
  directoryTitle: string,
): string {
  return `import { ${pascalName} } from './${filename}.jsx';

/**
 * Storybook Definition.
 */
export default {
  title: '${directoryTitle}/${humanName}',
  component: ${pascalName},
  args: {
    heading: '${humanName} Component',
    content: 'This is the content area of the ${humanName} React component. Replace it with your markup and data.',
  },
};

export const Default = {};
`;
}
