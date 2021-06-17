import { exec } from 'child_process';
/**
 * Takes a path to a script, and executes it.
 *
 * @param scriptPath string path to the script that should be executed.
 */
export default async function executeScript(
  scriptPath: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(scriptPath, (error, stdout, stderr) => {
      if (error) {
        return reject(error);
      }

      resolve(stdout ? stdout : stderr);
    });
  });
}
