/**
 * @file Builds Twig templates for generated components.
 */

/**
 * Generates the Twig markup file for a component.
 *
 * @param filename Kebab-case component file and folder name.
 * @param snakeName Snake-case prefix used by Twig variables and blocks.
 * @param className CSS base class name used by the component markup.
 * @param format Uppercase component format label used in the file header.
 * @returns Twig source content for the generated component markup file.
 */
export function buildTwigTemplate(
  filename: string,
  snakeName: string,
  className: string,
  format: string,
): string {
  const label = format === 'DEFAULT' ? 'STANDARD' : format;

  return `{#
/**
 * @file
 * ${filename}.twig
 * Format: ${label}
 *
 * Available variables:
 * - ${snakeName}__heading - the heading text for this component
 * - ${snakeName}__content - the body content of this component (typically text)
 *
 * Available blocks:
 * - ${snakeName}__content - override the content area with custom markup,
 *   for example: to embed an image or icon
 */
 #}
{% set ${snakeName}__base_class = '${className}' %}

<article class="{{ ${snakeName}__base_class }}">
  {% if ${snakeName}__heading %}
    <h2 class="{{ ${snakeName}__base_class }}__heading">{{ ${snakeName}__heading }}</h2>
  {% endif %}
  {% block ${snakeName}__content %}
    <div class="{{ ${snakeName}__base_class }}__content">
      {{ ${snakeName}__content }}
    </div>
  {% endblock %}
</article>
`;
}
