import { LogMethod } from 'src/lib/log.js';

const EGG = ['  __', ' /  \\', ' \\__/'].join('\n');

const DRUPAL_INTEGRATION_MESSAGE = [
  'Install the Drupal integration module:',
  '  composer require drupal/emulsify_tools',
  '  drush en emulsify_tools -y',
].join('\n');

const SYSTEM_SELECTION_MESSAGE = [
  'Next, choose a component system:',
  '  emulsify system install',
].join('\n');

/**
 * Returns the init success log messages for a given platform.
 *
 * @param platform name of platform.
 * @returns array containing objects with a log method, and message.
 */
export default function getInitSuccessMessageForPlatform(
  platform: string,
  _directory: string,
): {
  method: LogMethod;
  message: string;
}[] {
  if (platform === 'drupal') {
    return [
      {
        method: 'verbose',
        message: EGG,
      },
      {
        method: 'info',
        message: DRUPAL_INTEGRATION_MESSAGE,
      },
      {
        method: 'info',
        message: SYSTEM_SELECTION_MESSAGE,
      },
    ];
  }

  if (platform === 'none') {
    return [
      {
        method: 'verbose',
        message: EGG,
      },
      {
        method: 'info',
        message: SYSTEM_SELECTION_MESSAGE,
      },
    ];
  }

  return [];
}
