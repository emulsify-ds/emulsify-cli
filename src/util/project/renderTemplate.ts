/**
 * @file Renders project component template overrides with supported tokens.
 */

import log from '../../lib/log.js';

export type ComponentTemplateVars = {
  filename: string;
  className: string;
  camelName: string;
  pascalName: string;
  snakeName: string;
  humanName: string;
  directory: string;
  directoryTitle: string;
  format: string;
  formatLabel: string;
  type: string;
  tagName: string;
};

const tokenPattern = /{{\s*([A-Za-z][A-Za-z0-9]*)\s*}}/g;

/**
 * Renders double-brace tokens in a component template override.
 *
 * Supported tokens are `{{ filename }}`, `{{ className }}`, `{{ camelName }}`,
 * `{{ pascalName }}`, `{{ snakeName }}`, `{{ humanName }}`, `{{ directory }}`,
 * `{{ directoryTitle }}`, `{{ format }}`, `{{ formatLabel }}`, `{{ type }}`,
 * and `{{ tagName }}`.
 * Unknown tokens are left unchanged and logged as warnings.
 *
 * @param template raw template file content containing optional double-brace tokens.
 * @param vars component template values available for token replacement.
 * @returns rendered template content with supported tokens replaced.
 * @throws {Error} if token rendering fails unexpectedly.
 *
 * @example
 * renderTemplate('<h2>{{ humanName }}</h2>', {
 *   filename: 'featured-item',
 *   className: 'featured-item',
 *   camelName: 'featuredItem',
 *   pascalName: 'FeaturedItem',
 *   snakeName: 'featured_item',
 *   humanName: 'Featured Item',
 *   directory: 'base',
 *   directoryTitle: 'Base',
 *   format: 'default',
 *   formatLabel: 'STANDARD',
 *   type: 'twig',
 *   tagName: '',
 * });
 * // returns '<h2>Featured Item</h2>'
 */
export default function renderTemplate(
  template: string,
  vars: ComponentTemplateVars,
): string {
  const warnedTokens = new Set<string>();

  return template.replace(tokenPattern, (match, token: string) => {
    if (token in vars) {
      return vars[token as keyof ComponentTemplateVars];
    }

    if (!warnedTokens.has(token)) {
      warnedTokens.add(token);
      log(
        'warn',
        `Unknown component template token "{{ ${token} }}" left unchanged.`,
      );
    }

    return match;
  });
}
