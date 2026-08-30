import type { PlatformInstanceInfo } from '@emulsify-cli/internal';
import { dirname } from 'path';
import findFileInCurrentPath from '../fs/findFileInCurrentPath.js';

const WORDPRESS_THEMES_DIRECTORIES = [
  'wp-content/themes',
  'web/app/themes',
  'web/wp-content/themes',
] as const;

function getRootFromThemesDirectory(
  themesDirectory: string,
  relativeThemesDirectory: string,
): string {
  return relativeThemesDirectory
    .split('/')
    .reduce((root) => dirname(root), themesDirectory);
}

/**
 * Looks for a WordPress project within the cwd, and returns information about
 * the platform, site root, and themes directory.
 */
export default async function getWordPressInfo(): Promise<PlatformInstanceInfo | void> {
  try {
    const detectedThemesDirectories = WORDPRESS_THEMES_DIRECTORIES.map(
      (relativeThemesDirectory) => {
        const themesDirectory = findFileInCurrentPath(relativeThemesDirectory);
        if (!themesDirectory) {
          return undefined;
        }

        return {
          relativeThemesDirectory,
          themesDirectory,
          root: getRootFromThemesDirectory(
            themesDirectory,
            relativeThemesDirectory,
          ),
        };
      },
    ).filter((info) => info !== undefined);

    const detected = detectedThemesDirectories.sort(
      (a, b) =>
        b.themesDirectory.length - a.themesDirectory.length ||
        b.relativeThemesDirectory.length - a.relativeThemesDirectory.length,
    )[0];
    if (!detected) {
      return undefined;
    }

    return {
      name: 'wordpress',
      root: detected.root,
      emulsifyParentDirectory: detected.themesDirectory,
    };
  } catch {
    return undefined;
  }
}
