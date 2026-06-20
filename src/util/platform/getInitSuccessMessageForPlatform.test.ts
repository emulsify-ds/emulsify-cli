import getInitSuccessMessageForPlatform from './getInitSuccessMessageForPlatform.js';

const systemSelectionMessage = [
  'Next, choose a component system:',
  '  emulsify system install',
].join('\n');
const drupalIntegrationMessage = [
  'Detected a Drupal project.',
  '',
  'Install the required Drupal packages with Composer:',
  '  composer require drupal/emulsify drupal/emulsify_tools',
  '  drush en emulsify_tools -y',
  '',
  'The generated Drupal starter uses drupal/emulsify as its base theme and emulsify_tools for Drupal integration, so both packages must exist in the Drupal codebase.',
].join('\n');

describe('getInitSuccessMessageForPlatform', () => {
  it('returns compact Drupal integration and system selection guidance for detected Drupal projects', () => {
    expect.assertions(1);
    expect(
      getInitSuccessMessageForPlatform('drupal', '/directory', {
        includeDrupalInstallReminder: true,
      }),
    ).toEqual([
      {
        method: 'warn',
        message: drupalIntegrationMessage,
      },
      {
        method: 'info',
        message: systemSelectionMessage,
      },
    ]);
  });

  it('returns system selection guidance without Drupal install reminders for manually selected Drupal projects', () => {
    expect.assertions(4);
    const result = getInitSuccessMessageForPlatform('drupal', '/directory');
    const messages = result.map(({ message }) => message).join('\n');

    expect(result).toEqual([
      {
        method: 'info',
        message: systemSelectionMessage,
      },
    ]);
    expect(messages).not.toContain('composer require drupal/');
    expect(messages).not.toContain('emulsify_tools');
    expect(messages).not.toContain('drupal/emulsify');
  });

  it('does not mention old Drupal module requirements', () => {
    expect.assertions(4);
    const messages = getInitSuccessMessageForPlatform('drupal', '/directory', {
      includeDrupalInstallReminder: true,
    })
      .map(({ message }) => message)
      .join('\n');

    expect(messages).not.toContain('drupal/components');
    expect(messages).not.toContain('drupal/emulsify_twig');
    expect(messages).not.toContain('components emulsify_twig');
    expect(messages).not.toContain('emulsify_twig');
  });

  it('returns system selection guidance without Drupal module reminders for none', () => {
    expect.assertions(5);
    const result = getInitSuccessMessageForPlatform('none', '/directory');
    const messages = result.map(({ message }) => message).join('\n');

    expect(result).toEqual([
      {
        method: 'info',
        message: systemSelectionMessage,
      },
    ]);
    expect(messages).not.toContain('Drupal integration module');
    expect(messages).not.toContain('composer require drupal/');
    expect(messages).not.toContain('drush en');
    expect(messages).not.toContain('emulsify_tools');
  });

  it('keeps multiline output dense', () => {
    expect.assertions(1);
    const messages = getInitSuccessMessageForPlatform('drupal', '/directory', {
      includeDrupalInstallReminder: true,
    }).map(({ message }) => message);

    expect(messages).toEqual(
      messages.map((message) => message.replace(/^\n+|\n+$/g, '')),
    );
  });

  it('returns an empty array if the given platform does not correspond with any success messages', () => {
    expect.assertions(1);
    expect(getInitSuccessMessageForPlatform('java', '/directory')).toEqual([]);
  });
});
