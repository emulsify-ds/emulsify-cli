import { dirname, join } from 'path';
import findFileInCurrentPath from '../fs/findFileInCurrentPath.js';
import type { PlatformInstanceInfo } from '@emulsify-cli/internal';

/**
 * Looks for no platform specified within the cwd, and returns information
 * such as name, root path, and version.
 */
export default async function getNoPlatformInfo(): Promise<PlatformInstanceInfo | void> {
  const existingProject = findFileInCurrentPath('project.emulsify.json');
  if (!existingProject) {
    return undefined;
  }
  const root = dirname(existingProject);
  return {
    root,
    name: 'none',
    emulsifyParentDirectory: join(root, 'web', 'themes', 'custom'),
    platformMajorVersion: 1,
  };
}
