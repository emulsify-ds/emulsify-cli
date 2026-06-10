/**
 * @file Builds Drupal SDC metadata templates for generated components.
 */

/**
 * Generates the Drupal Single Directory Component metadata YAML file.
 *
 * @param snakeName Snake-case prefix used by the generated SDC props.
 * @param humanName Human-readable component name used in labels and seed data.
 * @returns YAML source content for the generated `.component.yml` metadata file.
 */
export function buildSdcMetadataTemplate(
  snakeName: string,
  humanName: string,
): string {
  return `$schema: https://git.drupalcode.org/project/drupal/-/raw/11.x/core/modules/sdc/src/metadata.schema.json
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
}
