/**
 * @file Builds Drupal SDC JavaScript templates for generated components.
 */

/**
 * Generates the Drupal behavior JavaScript file for an SDC component.
 *
 * @param camelName JavaScript-safe camelCase component identifier.
 * @param filename Kebab-case component file and folder name.
 * @param className CSS base class name queried by the Drupal behavior.
 * @returns JavaScript source content for the generated SDC behavior file.
 */
export function buildSdcJsTemplate(
  camelName: string,
  filename: string,
  className: string,
): string {
  return `/**
 * @file
 * JavaScript for the ${filename} component.
 */
\tDrupal.behaviors.${camelName} = {
  attach(context) {
    const elements = context.querySelectorAll('.${className}');
    elements.forEach((el) => {
\t      console.log('${filename} component attached:', el);
    });
  },
};
`;
}
