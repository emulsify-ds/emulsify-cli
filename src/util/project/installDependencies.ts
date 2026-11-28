import { execFile } from 'child_process';

const NPM_INSTALL_TIMEOUT_MS = 10 * 60 * 1_000;

/**
 * Executes `npm install` and pulls in dependencies within an Emulsify project.
 *
 * @param directory directory in which `npm install` should be run.
 * @param options whether to skip npm lifecycle scripts.
 */
export default async function installDependencies(
  directory: string,
  { ignoreScripts = false }: { ignoreScripts?: boolean } = {},
): Promise<string> {
  const args = ignoreScripts ? ['install', '--ignore-scripts'] : ['install'];
  const shell = process.platform === 'win32';
  // Windows needs a shell for npm.cmd. Only fixed CLI arguments go into it.
  const command = shell ? ['npm', ...args].join(' ') : 'npm';

  return new Promise((resolve, reject) => {
    execFile(
      command,
      shell ? [] : args,
      {
        cwd: directory,
        maxBuffer: Infinity,
        timeout: NPM_INSTALL_TIMEOUT_MS,
        shell,
      },
      (error, stdout, stderr) => {
        if (error) {
          return reject(error);
        }

        resolve(stdout ? stdout : stderr);
      },
    );
  });
}
