import type { EmulsifyStarter } from '@emulsify-cli/internal';

/**
 * Returns a list of all Emulsify starter projects, such as Drupal themes.
 *
 * @returns array of EmulsifyStarter objects.
 */
export default function getAvailableStarters(): EmulsifyStarter[] {
  return [
    {
      platform: 'drupal',
      platformMajorVersion: 9,
      repository: 'https://github.com/emulsify-ds/emulsify-drupal.git',
      checkout: 'master',
    },
  ];
}
