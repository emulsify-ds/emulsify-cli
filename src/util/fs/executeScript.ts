import { execFile } from 'child_process';
import { dirname } from 'path';

/**
 * Takes a path to a script, and executes it.
 *
 * @param scriptPath string path to the script that should be executed.
 */
export default async function executeScript(
  scriptPath: string,
): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(
      process.execPath,
      [scriptPath],
      {
        // Run from the hook directory so hook-relative file operations do not
        // depend on the shell location that invoked the CLI.
        cwd: dirname(scriptPath),
        encoding: 'utf8',
      },
      (error, stdout, stderr) => {
        if (error) {
          const output = stderr.trim() || error.message;

          return reject(
            new Error(
              `Unable to execute hook script "${scriptPath}": ${output}`,
            ),
          );
        }

        resolve(stdout || stderr || '');
      },
    );
  });
}
