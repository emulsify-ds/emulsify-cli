/**
 * @file Builds SCSS templates for generated components.
 */

/**
 * Generates the base SCSS file for a component.
 *
 * @param className CSS base class name used by the component markup.
 * @param formatLabel Display-ready component format label used in the file header.
 * @returns SCSS source content for the generated component stylesheet.
 */
export function buildScssTemplate(
  className: string,
  formatLabel: string,
): string {
  return `/*
 * Base Styles for ${className} (${formatLabel})
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
}
