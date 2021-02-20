import type {
  ComposerJson,
  PlatformInstanceInfo,
} from '@emulsify-cli/internal';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import findFileInCurrentPath from '../findFileInCurrentPath';

/**
 * Looks for a Drupal project within the cwd, and returns information about the
 * platform (such as name, root path, and version).
 */
export default function getDrupalInfo(): PlatformInstanceInfo | void {
  const path = findFileInCurrentPath('composer.json');

  // If no composer.json file exists within the current path, the program is not
  // being run from within a Drupal project.
  if (!path) {
    return undefined;
  }

  try {
    const json = JSON.parse(readFileSync(path, 'utf8')) as ComposerJson;
    if (json.extra?.['installer-paths']?.core?.includes('type:drupal-core')) {
      const root = dirname(path);
      return {
        root,
        name: 'drupal',
        emulsifyParentDirectory: join(root, 'themes'),
        // @TODO: parse composer lock file and determine drupal core version.
        platformMajorVersion: 9,
      };
    }
  } catch {
    return undefined;
  }

  return undefined;
}
