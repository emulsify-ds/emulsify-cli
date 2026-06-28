import type { PlatformInstanceInfo } from '@emulsify-cli/internal';

import getDrupalInfo from './getDrupalInfo.js';
import getNoPlatformInfo from './getNoPlatformInfo.js';
import getWordPressInfo from './getWordPressInfo.js';

/**
 * Returns information about the platform the user is currently within (cwd), if it
 * exists and is detectable.
 */
export default async function getPlatformInfo(): Promise<PlatformInstanceInfo | void> {
  const drupal = await getDrupalInfo();
  if (drupal) {
    return drupal;
  }

  const wordpress = await getWordPressInfo();
  if (wordpress) {
    return wordpress;
  }

  return await getNoPlatformInfo();
}
