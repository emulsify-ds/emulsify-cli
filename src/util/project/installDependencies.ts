import { exec } from 'child_process';
/**
 * Executes `npm install` and pulls in dependencies within an Emulsify project.
 *
 * @param directory directory in which `npm install` should be run.
 */
export default async function installDependencies(
  directory: string,
): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(
      'npm install',
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
