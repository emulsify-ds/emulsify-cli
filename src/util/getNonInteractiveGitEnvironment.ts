export default function getNonInteractiveGitEnvironment(
  environment: NodeJS.ProcessEnv = process.env,
): NodeJS.ProcessEnv {
  return {
    ...environment,
    GIT_TERMINAL_PROMPT: '0',
    GIT_SSH_COMMAND: environment.GIT_SSH_COMMAND || 'ssh -oBatchMode=yes',
  };
}
