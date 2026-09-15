/**
 * @file log.ts
 * Exports methods that MUST be used when writing to the console.
 */

import { log as render } from '@clack/prompts';
import { dim } from 'colorette';
import { getDiagnosticOutput, isInteractiveOutput } from './session.js';

export type LogMethod =
  'info' | 'error' | 'warn' | 'debug' | 'verbose' | 'success';

/**
 * Lib function that allows for info, error, warn, debug, verbose, and success messages
 * to be written to the console with consistent symbols and colors. This function
 * only writes log output and never exits the process.
 *
 * @remarks Every message is drawn on the session gutter so a command reads as
 * one continuous transcript. Warnings and errors are written to stderr; the rest
 * go to stdout.
 *
 * @param method method that should be used to log, such as 'error', or 'warn'.
 * @param message string containing message to be logged.
 */
export default function log(method: LogMethod, message: string): void {
  // Piped or redirected output is read by scripts, so it gets plain lines with
  // no gutter, no symbols, and no color.
  if (!isInteractiveOutput()) {
    const stream =
      method === 'error' || method === 'warn' ? process.stderr : process.stdout;

    stream.write(`${message}\n`);
    return;
  }

  switch (method) {
    case 'error':
      render.error(message, { output: getDiagnosticOutput() });
      return;
    case 'warn':
      render.warn(message, { output: getDiagnosticOutput() });
      return;
    case 'info':
      render.info(message);
      return;
    case 'success':
      render.success(message);
      return;
    default:
      render.message(dim(message));
  }
}
