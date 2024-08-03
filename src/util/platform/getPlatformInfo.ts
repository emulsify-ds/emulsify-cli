import type { PlatformInstanceInfo } from '@emulsify-cli/internal';

import getDrupalInfo from './getDrupalInfo.js';

/**
 * Returns information about the platform the user is currently within (cwd), if it
 * exists and is detectable.
 */
export default async function getPlatformInfo(): Promise<PlatformInstanceInfo | void> {
  // @TODO: add support for more platforms, such as wordpress.
  const drupal = await getDrupalInfo();
  return drupal || undefined;
}
