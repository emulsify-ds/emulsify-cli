const childProcess = require('node:child_process');
const { writeFileSync } = require('node:fs');
const { syncBuiltinESMExports } = require('node:module');

const { spawn } = childProcess;
childProcess.spawn = (command, args, options) => {
  if (command === 'git' && args?.[0] === 'clone') {
    const { GIT_ASKPASS, GIT_SSH_COMMAND, GIT_TERMINAL_PROMPT, SSH_ASKPASS } =
      options.env ?? process.env;
    writeFileSync(
      process.env.EMULSIFY_E2E_GIT_CLONE_ENV,
      JSON.stringify({
        GIT_ASKPASS,
        GIT_SSH_COMMAND,
        GIT_TERMINAL_PROMPT,
        SSH_ASKPASS,
      }),
    );
  }
  return spawn(command, args, options);
};
syncBuiltinESMExports();
