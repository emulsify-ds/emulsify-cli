import { execFile } from 'child_process';
import { dirname, resolve as resolvePath } from 'path';

/**
 * Takes a path to a script, and executes it.
 *
 * @param scriptPath string path to the script that should be executed.
 */
export default async function executeScript(
  scriptPath: string,
): Promise<string> {
  const resolvedScriptPath = resolvePath(scriptPath);

  return new Promise((resolve, reject) => {
    execFile(
      process.execPath,
      [resolvedScriptPath],
      {
        // Run from the hook directory so hook-relative file operations do not
        // depend on the shell location that invoked the CLI.
        cwd: dirname(resolvedScriptPath),
        encoding: 'utf8',
      },
      (error, stdout, stderr) => {
        if (error) {
          const output = stderr.trim() || error.message;

          return reject(
            new Error(
              `Unable to execute hook script "${resolvedScriptPath}": ${output}`,
            ),
          );
        }

        resolve(stdout || stderr || '');
      },
    );
  });
}
