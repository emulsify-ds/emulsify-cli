/**
 * @file Derives and validates autonomous custom-element tag names.
 */

const reservedCustomElementNames = new Set([
  'annotation-xml',
  'color-profile',
  'font-face',
  'font-face-src',
  'font-face-uri',
  'font-face-format',
  'font-face-name',
  'missing-glyph',
]);

const validCustomElementNameCharacterPattern =
  /^[-.0-9_a-z\u00B7\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u037D\u037F-\u1FFF\u200C-\u200D\u203F-\u2040\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\u{10000}-\u{EFFFF}]*$/u;

/**
 * Derives the suggested custom-element tag for a component.
 *
 * Multi-word component filenames already satisfy the browser requirement for a
 * hyphen, so they remain portable across projects. Single-word filenames use
 * the project machine name as their namespace.
 *
 * @param filename Kebab-case component filename.
 * @param projectMachineName Machine name from project.emulsify.json.
 * @returns Suggested custom-element tag name. Validate it before use.
 */
export function deriveCustomElementTagName(
  filename: string,
  projectMachineName: string,
): string {
  return filename.includes('-')
    ? filename
    : `${projectMachineName}-${filename}`;
}

/**
 * Enforces the same autonomous custom-element name rules as Emulsify Core.
 *
 * @param tagName Candidate tag name.
 * @throws {SyntaxError} when the value cannot be registered as an autonomous
 * custom element.
 */
export function assertValidCustomElementTagName(
  tagName: unknown,
): asserts tagName is string {
  if (
    typeof tagName !== 'string' ||
    !/^[a-z]/u.test(tagName) ||
    !validCustomElementNameCharacterPattern.test(tagName.slice(1)) ||
    !tagName.includes('-') ||
    reservedCustomElementNames.has(tagName)
  ) {
    throw new SyntaxError(
      `Invalid custom element tag name "${String(
        tagName,
      )}". Names must start with an ASCII lowercase letter, contain a hyphen, use browser-supported custom-element name characters, and must not be a reserved name.`,
    );
  }
}
