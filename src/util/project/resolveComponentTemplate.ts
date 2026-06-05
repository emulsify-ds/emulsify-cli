/**
 * @file Resolves project-level component template override files.
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import { pathExists } from 'fs-extra';

import log from '../../lib/log.js';
import { EMULSIFY_PROJECT_TEMPLATES_FOLDER } from '../../lib/constants.js';
import renderTemplate, { ComponentTemplateVars } from './renderTemplate.js';

// Component overrides intentionally mirror built-in artifacts one-for-one:
// .cli/templates/<format>/<logicalName> replaces only that known generated file.
// Missing overrides are normal partial customization; empty overrides fall back.

/**
 * Resolves and renders a component template override if one exists for an artifact.
 *
 * @param projectRoot absolute path to the Emulsify project root.
 * @param format component format, such as `default` or `sdc`.
 * @param logicalName logical template file name, such as `component.twig`.
 * @param vars component template values available for token replacement.
 * @returns rendered override content, or null when the built-in template should be used.
 * @throws {Error} if an existing override file cannot be read.
 *
 * @example
 * await resolveComponentTemplate('/project', 'default', 'component.twig', {
 *   filename: 'featured-item',
 *   className: 'featured-item',
 *   camelName: 'featuredItem',
 *   snakeName: 'featured_item',
 *   humanName: 'Featured Item',
 *   directory: 'base',
 *   format: 'default',
 * });
 * // reads /project/.cli/templates/default/component.twig if it exists.
 */
export default async function resolveComponentTemplate(
  projectRoot: string,
  format: string,
  logicalName: string,
  vars: ComponentTemplateVars,
): Promise<string | null> {
  const templatePath = join(
    projectRoot,
    EMULSIFY_PROJECT_TEMPLATES_FOLDER,
    format,
    logicalName,
  );

  if (!(await pathExists(templatePath))) {
    return null;
  }

  const template = await fs.readFile(templatePath, 'utf8');
  if (template.trim() === '') {
    log(
      'warn',
      `Component template override "${templatePath}" is empty; using the built-in template instead.`,
    );
    return null;
  }

  return renderTemplate(template, vars);
}
