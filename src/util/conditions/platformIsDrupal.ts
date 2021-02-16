import type { ComposerJson } from '@emulsify-cli/internal';
import { readFileSync } from 'fs';
import findFileInCurrentPath from '../findFileInCurrentPath';

/**
 * Conditional function that determines whether or not the cwd is within a Drupal project.
 *
 * @returns boolean indicating whether or not the cwd is within a Drupal project.
 */
export default function platformIsDrupal(): boolean {
  const path = findFileInCurrentPath('composer.json');

  // If no composer.json file exists within the current path, the program is not
  // being run from within a Drupal project.
  if (!path) {
    return false;
  }

  try {
    const json = JSON.parse(readFileSync(path, 'utf8')) as ComposerJson;
    return !!json.extras?.['installer-paths']?.core?.includes(
      'type:drupal-core'
    );
  } catch {
    return false;
  }
}
