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

// Match canonical names lazily so plausible unknown names containing `_` still
// warn without consuming the adjacent Twig suffix in an ejected expression
// such as `{{ __EMULSIFY_snakeName____base_class }}`. The first `__` must
// remain the closing delimiter so the outer Twig expression survives intact.
const tokenPattern = /__EMULSIFY_([A-Za-z][A-Za-z0-9_]*?)__/g;

// Keep this legacy pattern deliberately narrow. A v2.3 override can nest a
// token inside a Twig print expression (`{{ {{ snakeName }}__base_class }}`).
// Matching only the inner identifier preserves the outer Twig braces; allowing
// `_` or `.` here could consume part of that expression and corrupt the output.
const legacyTokenPattern = /{{\s*([A-Za-z][A-Za-z0-9]*)\s*}}/g;
const legacyTokenNames = new Set<string>([
  'filename',
  'className',
  'camelName',
  'snakeName',
  'humanName',
  'directory',
  'format',
]);

/** Return the collision-free placeholder for a component template value. */
export function componentTemplateToken(
  name: keyof ComponentTemplateVars,
): string {
  return `__EMULSIFY_${name}__`;
}

/**
 * Renders namespaced tokens in a component template override.
 *
 * Supported tokens are `__EMULSIFY_filename__`, `__EMULSIFY_className__`,
 * `__EMULSIFY_camelName__`, `__EMULSIFY_pascalName__`,
 * `__EMULSIFY_snakeName__`, `__EMULSIFY_humanName__`,
 * `__EMULSIFY_directory__`, `__EMULSIFY_directoryTitle__`,
 * `__EMULSIFY_format__`, `__EMULSIFY_formatLabel__`, `__EMULSIFY_type__`,
 * and `__EMULSIFY_tagName__`.
 * Unknown tokens are left unchanged and logged as warnings.
 *
 * @param template raw template file content containing optional namespaced tokens.
 * @param vars component template values available for token replacement.
 * @returns rendered template content with supported tokens replaced.
 * @throws {Error} if token rendering fails unexpectedly.
 *
 * @example
 * renderTemplate('<h2>__EMULSIFY_humanName__</h2>', {
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
  return renderTokens(template, vars, tokenPattern);
}

/** Render the double-brace token syntax used by v2.3 alias directories. */
export function renderLegacyTemplate(
  template: string,
  vars: ComponentTemplateVars,
): string {
  return renderTokens(template, vars, legacyTokenPattern, legacyTokenNames);
}

function renderTokens(
  template: string,
  vars: ComponentTemplateVars,
  pattern: RegExp,
  supportedTokens?: ReadonlySet<string>,
): string {
  const warnedTokens = new Set<string>();

  return template.replace(pattern, (match, token: string) => {
    if (
      (!supportedTokens || supportedTokens.has(token)) &&
      Object.hasOwn(vars, token)
    ) {
      return vars[token as keyof ComponentTemplateVars];
    }

    if (!warnedTokens.has(token)) {
      warnedTokens.add(token);
      log(
        'warn',
        `Unknown component template token "${match}" left unchanged.`,
      );
    }

    return match;
  });
}
