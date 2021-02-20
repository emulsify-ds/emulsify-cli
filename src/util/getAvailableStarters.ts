import type { EmulsifyBase } from '@emulsify-cli/internal';

/**
 * Returns a list of all Emulsify base projects, such as Drupal themes.
 *
 * @returns array of EmulsifyBase objects.
 */
export default function getAvailableBases(): EmulsifyBase[] {
  return [
    {
      platform: 'drupal',
      platformMajorVersion: 9,
      repository: 'https://github.com/emulsify-ds/emulsify-drupal.git',
      checkout: '2.x',
    },
  ];
}
