import { LogMethod } from 'src/lib/log.js';

const DRUPAL_INTEGRATION_MESSAGE = [
  'Detected a Drupal project.',
  '',
  'Install the required Drupal packages with Composer:',
  '  composer require drupal/emulsify drupal/emulsify_tools',
  '  drush en emulsify_tools -y',
  '',
  'The generated Drupal starter uses drupal/emulsify as its base theme and emulsify_tools for Drupal integration, so both packages must exist in the Drupal codebase.',
].join('\n');

const SYSTEM_SELECTION_MESSAGE = [
  'Next, choose a component system:',
  '  emulsify system install',
].join('\n');

type InitSuccessMessageOptions = {
  includeDrupalInstallReminder?: boolean;
};

/**
 * Returns the init success log messages for a given platform.
 *
 * @param platform name of platform.
 * @param options.includeDrupalInstallReminder whether to include Composer package guidance for an auto-detected Drupal project.
 * @returns array containing objects with a log method, and message.
 */
export default function getInitSuccessMessageForPlatform(
  platform: string,
  _directory: string,
  options: InitSuccessMessageOptions = {},
): {
  method: LogMethod;
  message: string;
}[] {
  if (platform === 'drupal') {
    const messages: {
      method: LogMethod;
      message: string;
    }[] = [];

    if (options.includeDrupalInstallReminder) {
      messages.push({
        method: 'warn',
        message: DRUPAL_INTEGRATION_MESSAGE,
      });
    }

    messages.push({
      method: 'info',
      message: SYSTEM_SELECTION_MESSAGE,
    });

    return messages;
  }

  if (platform === 'none') {
    return [
      {
        method: 'info',
        message: SYSTEM_SELECTION_MESSAGE,
      },
    ];
  }

  return [];
}
