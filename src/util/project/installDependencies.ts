import { exec } from 'child_process';
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
  return new Promise((resolve, reject) => {
    exec(
      ignoreScripts ? 'npm install --ignore-scripts' : 'npm install',
      {
        cwd: directory,
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
