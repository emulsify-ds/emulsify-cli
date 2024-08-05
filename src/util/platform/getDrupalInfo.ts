import type {
  ComposerJson,
  PlatformInstanceInfo,
} from '@emulsify-cli/internal';
import { dirname, join } from 'path';
import findFileInCurrentPath from '../fs/findFileInCurrentPath';
import loadJsonFile from '../fs/loadJsonFile';

/**
 * Looks for a Drupal project within the cwd, and returns information about the
 * platform (such as name, root path, and version).
 */
export default async function getDrupalInfo(): Promise<PlatformInstanceInfo | void> {
  try {
    const path = findFileInCurrentPath('composer.json');
    if (!path) {
      return undefined;
    }

    const json = await loadJsonFile<ComposerJson>(path);
    if (json && json.extra?.['drupal-scaffold']?.locations?.['web-root']) {
      const root = join(
        dirname(path),
        json.extra['drupal-scaffold'].locations['web-root'],
      );

      return {
        root,
        name: 'drupal',
        emulsifyParentDirectory: join(root, 'themes', 'custom'),
        // @TODO: parse composer lock file and determine drupal core version.
        platformMajorVersion: 9,
      };
    }
  } catch {
    return undefined;
  }

  return undefined;
}
