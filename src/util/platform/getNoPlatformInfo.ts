import type { PlatformInstanceInfo } from '@emulsify-cli/internal';
import { resolve } from 'path';
import findFileInCurrentPath from '../fs/findFileInCurrentPath.js';
import { resolveCurrentPath } from '../fs/resolveCurrentPath.js';

/**
 * Looks for no platform specified within the cwd, and returns information
 * such as name, root path, and version.
 */
export default async function getNoPlatformInfo(): Promise<PlatformInstanceInfo | void> {
  const existingProject = findFileInCurrentPath('project.emulsify.json');
  if (!existingProject) {
    return undefined;
  }
  const { directoryPath } = resolveCurrentPath();
  const root = resolve(directoryPath);

  return {
    root,
    name: 'none',
    emulsifyParentDirectory: root,
    platformMajorVersion: 1,
  };
}
