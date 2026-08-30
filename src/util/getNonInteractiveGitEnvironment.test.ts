import getNonInteractiveGitEnvironment from './getNonInteractiveGitEnvironment.js';

describe('getNonInteractiveGitEnvironment', () => {
  it('disables Git and SSH prompts by default', () => {
    expect(getNonInteractiveGitEnvironment({ EXISTING: 'value' })).toEqual({
      EXISTING: 'value',
      GIT_TERMINAL_PROMPT: '0',
      GIT_SSH_COMMAND: 'ssh -oBatchMode=yes',
    });
  });

  it('preserves an explicitly configured SSH command', () => {
    expect(
      getNonInteractiveGitEnvironment({
        GIT_TERMINAL_PROMPT: '1',
        GIT_SSH_COMMAND: 'custom-ssh --identity custom-key',
      }),
    ).toEqual({
      GIT_TERMINAL_PROMPT: '0',
      GIT_SSH_COMMAND: 'custom-ssh --identity custom-key',
    });
  });
});
