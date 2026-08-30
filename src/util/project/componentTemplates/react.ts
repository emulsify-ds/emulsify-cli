/**
 * @file Builds React component templates.
 */

/**
 * Generates a React component that Storybook can render through its standard
 * React support.
 *
 * @param pascalName PascalCase JavaScript component identifier.
 * @param filename Kebab-case component file and folder name.
 * @param className CSS base class name used by the component markup.
 * @param humanName Human-readable component name used in default content.
 * @returns JSX source content for the generated React component.
 */
export function buildReactTemplate(
  pascalName: string,
  filename: string,
  className: string,
  humanName: string,
): string {
  return `/**
 * @file
 * ${filename}.jsx
 */
import React from 'react';

export function ${pascalName}({
  heading = '${humanName} Component',
  content = 'This is the content area of the ${humanName} React component. Replace it with your markup and data.',
}) {
  return (
    <article className="${className}">
      {heading && <h2 className="${className}__heading">{heading}</h2>}
      <div className="${className}__content">{content}</div>
    </article>
  );
}
`;
}
