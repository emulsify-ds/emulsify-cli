/**
 * @file Builds Storybook stories for generated web components.
 */

/**
 * Generates a CSF story using Emulsify Core's custom-element renderer.
 *
 * @param filename Kebab-case component file and folder name.
 * @param humanName Human-readable component name shown in Storybook.
 * @param directoryTitle Display-ready Storybook title group.
 * @param tagName Valid autonomous custom-element tag name.
 * @returns JavaScript source content for the generated web component story.
 */
export function buildWebComponentStoriesTemplate(
  filename: string,
  humanName: string,
  directoryTitle: string,
  tagName: string,
): string {
  return `import { renderWebComponent } from '@emulsify/core/storybook';
import './${filename}.js';

/**
 * Storybook Definition.
 */
export default {
  title: '${directoryTitle}/${humanName}',
  render: renderWebComponent('${tagName}'),
  args: {
    heading: '${humanName} Component',
    content: 'This is the content area of the ${humanName} web component. Replace it with your markup and data.',
  },
};

export const Default = {};
`;
}
