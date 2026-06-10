/**
 * @file CliError.ts
 * Exports the standard error type for expected CLI failures.
 */

/**
 * Error type for expected CLI failures that should be shown to the user and
 * mapped to a process exit code by the top-level command runner.
 *
 * @param message user-facing error message.
 * @param exitCode process exit code to set when this error reaches the top-level handler. Defaults to 1.
 */
export default class CliError extends Error {
  /**
   * Process exit code to set when this error reaches the top-level handler. Defaults to 1.
   */
  exitCode: number;

  constructor(message: string, exitCode = 1) {
    super(message);
    this.name = 'CliError';
    this.exitCode = exitCode;
  }
}
