/**
 * @file Builds YAML data templates for standard generated components.
 */

/**
 * Generates the sample YAML data file for a standard Emulsify component.
 *
 * @param snakeName Snake-case prefix used by the generated YAML keys.
 * @param humanName Human-readable component name used in seed data.
 * @returns YAML source content for the generated standard component data file.
 */
export function buildYmlTemplate(snakeName: string, humanName: string): string {
  return `${snakeName}__heading: '${humanName} Component'
${snakeName}__content: 'This is the content area of the ${humanName} component, created using the standard Emulsify format. Replace with your markup and data.'
`;
}
