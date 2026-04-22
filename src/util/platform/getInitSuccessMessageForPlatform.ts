import { LogMethod } from 'src/lib/log';
import { cyan } from 'colorette';

/**
 * Returns the init success log messages for a given platform.
 *
 * @param platform name of platform.
 * @returns array containing objects with a log method, and message.
 */
export default function getInitSuccessMessageForPlatform(
  platform: string,
  directory: string,
): {
  method: LogMethod;
  message: string;
}[] {
  if (platform === 'none' || platform === 'drupal') {
    return [
      {
        method: 'info',
        message:
          'Make sure you install the modules your Emulsify-based theme requires in order to function.',
      },
      {
        method: 'verbose',
        message: `
            - composer require drupal/components
            - composer require drupal/emulsify_twig
            - drush en components emulsify_twig -y
            `,
      },
      {
        method: 'info',
        message: `Once the requirements have been installed, you will need to select a component system to use, as Emulsify does not come with components by default. To do this, navigate to your theme directory (${directory}), and choose a command below.`,
      },
      {
        method: 'verbose',
        message: `
            ${cyan('List systems')}: emulsify system list
            ${cyan('Install a system')}: emulsify system install "system-name"
            ${cyan(
              'Install default system with default components',
            )}: emulsify system install compound
            ${cyan(
              'Install default system with all components',
            )}: emulsify system install compound --all
            `,
      },
    ];
  }

  return [];
}
