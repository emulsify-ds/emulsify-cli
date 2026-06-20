import getInitSuccessMessageForPlatform from './getInitSuccessMessageForPlatform.js';

const egg = ['  __', ' /  \\', ' \\__/'].join('\n');
const systemSelectionMessage = [
  'Next, choose a component system:',
  '  emulsify system install',
].join('\n');
const drupalIntegrationMessage = [
  'Install the Drupal integration module:',
  '  composer require drupal/emulsify_tools',
  '  drush en emulsify_tools -y',
].join('\n');

describe('getInitSuccessMessageForPlatform', () => {
  it('returns compact Drupal integration and system selection guidance', () => {
    expect.assertions(1);
    expect(getInitSuccessMessageForPlatform('drupal', '/directory')).toEqual([
      {
        method: 'verbose',
        message: egg,
      },
      {
        method: 'info',
        message: drupalIntegrationMessage,
      },
      {
        method: 'info',
        message: systemSelectionMessage,
      },
    ]);
  });

  it('does not mention old Drupal module requirements', () => {
    expect.assertions(4);
    const messages = getInitSuccessMessageForPlatform('drupal', '/directory')
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
        method: 'verbose',
        message: egg,
      },
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
    const messages = getInitSuccessMessageForPlatform(
      'drupal',
      '/directory',
    ).map(({ message }) => message);

    expect(messages).toEqual(
      messages.map((message) => message.replace(/^\n+|\n+$/g, '')),
    );
  });

  it('returns an empty array if the given platform does not correspond with any success messages', () => {
    expect.assertions(1);
    expect(getInitSuccessMessageForPlatform('java', '/directory')).toEqual([]);
  });
});
