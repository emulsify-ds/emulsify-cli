import { LogMethod } from 'src/lib/log.js';

const DRUPAL_INTEGRATION_TITLE = 'Drupal also needs';
const DRUPAL_INTEGRATION_MESSAGE = [
  'composer require drupal/emulsify drupal/emulsify_tools',
  'drush en emulsify_tools -y',
  '',
  'The generated starter uses drupal/emulsify as its base theme and',
  'emulsify_tools for Drupal integration, so both packages must exist',
  'in the Drupal codebase.',
].join('\n');

const SYSTEM_SELECTION_TITLE = 'Next';
const SYSTEM_SELECTION_MESSAGE = [
  'emulsify system install',
  '',
  'Pick a component system to render with. Nothing renders until one',
  'is installed.',
].join('\n');

export type InitSuccessMessage = {
  /** Log level used when the message is written as a single line. */
  method: LogMethod;
  /** Message body. */
  message: string;
  /** Heading shown when the message is rendered as a block. */
  title?: string;
};

type InitSuccessMessageOptions = {
  includeDrupalInstallReminder?: boolean;
};

/**
 * Returns the init success messages for a given platform.
 *
 * @remarks These describe what to do next on a run that succeeded, so they are
 * written as guidance rather than as warnings.
 *
 * @param platform name of platform.
 * @param options.includeDrupalInstallReminder whether to include Composer package guidance for an auto-detected Drupal project.
 * @returns array containing objects with a log method, message, and optional block title.
 */
export default function getInitSuccessMessageForPlatform(
  platform: string,
  _directory: string,
  options: InitSuccessMessageOptions = {},
): InitSuccessMessage[] {
  if (platform === 'drupal') {
    const messages: InitSuccessMessage[] = [];

    if (options.includeDrupalInstallReminder) {
      messages.push({
        method: 'info',
        message: DRUPAL_INTEGRATION_MESSAGE,
        title: DRUPAL_INTEGRATION_TITLE,
      });
    }

    messages.push({
      method: 'info',
      message: SYSTEM_SELECTION_MESSAGE,
      title: SYSTEM_SELECTION_TITLE,
    });

    return messages;
  }

  if (platform === 'none') {
    return [
      {
        method: 'info',
        message: SYSTEM_SELECTION_MESSAGE,
        title: SYSTEM_SELECTION_TITLE,
      },
    ];
  }

  return [];
}
