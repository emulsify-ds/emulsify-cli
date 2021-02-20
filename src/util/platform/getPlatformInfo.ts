import type { PlatformInstanceInfo } from '@emulsify-cli/internal';

import getDrupalInfo from './getDrupalInfo';

/**
 * Returns information about the platform the user is currently within (cwd), if it
 * exists and is detectable.
 */
export default function getPlatformInfo(): PlatformInstanceInfo | void {
  // @TODO: add support for more platforms, such as wordpress.
  const drupal = getDrupalInfo();
  return drupal || undefined;
}
