import type { EmulsifyStarter } from '@emulsify-cli/internal';

/**
 * Returns a list of all Emulsify starter projects, such as Drupal themes.
 *
 * @returns array of EmulsifyStarter objects.
 */
export default function getAvailableStarters(): EmulsifyStarter[] {
  return [
    {
      platform: 'none',
      platformMajorVersion: 1,
      repository: 'https://github.com/emulsify-ds/emulsify-starter',
      checkout: 'main',
    },
    {
      platform: 'drupal',
      platformMajorVersion: 11,
      repository: 'https://github.com/emulsify-ds/emulsify-drupal-starter',
      checkout: 'main',
    },
  ];
}
