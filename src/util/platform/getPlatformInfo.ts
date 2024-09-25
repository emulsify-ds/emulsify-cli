import type { PlatformInstanceInfo } from '@emulsify-cli/internal';

import getDrupalInfo from './getDrupalInfo.js';
import getNoPlatformInfo from './getNoPlatformInfo.js';

/**
 * Returns information about the platform the user is currently within (cwd), if it
 * exists and is detectable.
 */
export default async function getPlatformInfo(): Promise<PlatformInstanceInfo | void> {
  // @TODO: add support for more platforms, such as wordpress.
  const drupal = await getDrupalInfo();
  const noPlatform = await getNoPlatformInfo();
  const platform = drupal ? drupal : noPlatform;
  return platform;
}
