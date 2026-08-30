/**
 * @file Derives reusable component name forms for generated component files.
 */

import strToMachineName from './strToMachineName.js';

export type DerivedComponentNames = {
  filename: string;
  className: string;
  camelName: string;
  pascalName: string;
  snakeName: string;
  humanName: string;
};

const componentNamePattern = /^[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$/;

/**
 * Derives the filesystem, CSS, JavaScript, YAML, and display name forms for a component.
 *
 * @param componentName Raw component name provided by the user.
 * @returns Object containing filename (kebab-case file/folder name), className (CSS base class),
 * camelName (JavaScript identifier), snakeName (YAML property prefix), and humanName
 * (display title).
 * @throws {Error} if the component name is empty after trimming, has no alphanumeric
 * characters, or contains characters outside letters, numbers, and hyphens.
 *
 * @example
 * deriveComponentNames('featuredItem');
 * // returns {
 * //   filename: 'featured-item',
 * //   className: 'featured-item',
 * //   camelName: 'featuredItem',
 * //   snakeName: 'featured_item',
 * //   humanName: 'Featured Item',
 * // }
 */
export default function deriveComponentNames(
  componentName: string,
): DerivedComponentNames {
  const sanitizedName = componentName?.trim() ?? '';

  if (!sanitizedName || !/[A-Za-z0-9]/.test(sanitizedName)) {
    throw new Error(
      'Component name must include at least one letter or number.',
    );
  }

  if (!componentNamePattern.test(sanitizedName)) {
    throw new Error(
      'Component name may only include letters, numbers, and single hyphens between words.',
    );
  }

  // kebab-case filename: featuredItem -> featured-item, featured-item -> featured-item
  const filename = strToMachineName(
    sanitizedName.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/-/g, ' '),
  );

  // CSS class name is the same as the filename (kebab-case).
  const className = filename;

  // camelCase identifier for JS variables (featured-item -> featuredItem).
  const camelName = filename.replace(/-([a-z])/g, (_, c: string) =>
    c.toUpperCase(),
  );

  // PascalCase identifier for generated JavaScript classes and components.
  // Prefix numeric-leading names so every generated identifier is valid.
  const pascalCandidate = `${camelName.charAt(0).toUpperCase()}${camelName.slice(1)}`;
  const pascalName = /^[A-Za-z_$]/.test(pascalCandidate)
    ? pascalCandidate
    : `Component${pascalCandidate}`;

  // snake_case for YAML prop keys (featured-item -> featured_item).
  const snakeName = filename.replace(/-/g, '_');

  // Human-readable title (featured-item -> Featured Item).
  const humanName = filename
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return {
    filename,
    className,
    camelName,
    pascalName,
    snakeName,
    humanName,
  };
}
