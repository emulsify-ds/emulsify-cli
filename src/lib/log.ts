/**
 * @file log.ts
 * Exports methods that MUST be used when writing to the console.
 */

import { log as render } from '@clack/prompts';
import { dim } from 'colorette';
import {
  getRendererOutput,
  isInteractiveOutput,
  stripAnsi,
} from './session.js';

export type LogMethod =
  'info' | 'error' | 'warn' | 'debug' | 'verbose' | 'success';

/**
 * Lib function that allows for info, error, warn, debug, verbose, and success messages
 * to be written to the console with consistent symbols and colors. This function
 * only writes log output and never exits the process.
 *
 * @remarks Terminal output shares the session gutter. Warnings and errors go
 * to stderr, and other messages go to stdout.
 *
 * @param method method that should be used to log, such as 'error', or 'warn'.
 * @param message string containing message to be logged.
 * @param outputs destination streams.
 */
export default function log(
  method: LogMethod,
  message: string,
  {
    stdout,
    stderr,
  }: {
    stdout: NodeJS.WriteStream;
    stderr: NodeJS.WriteStream;
  } = process,
): void {
  const stream = method === 'error' || method === 'warn' ? stderr : stdout;
  // Piped or redirected output is read by scripts, so it gets plain lines with
  // no gutter, no symbols, and no color.
  if (!isInteractiveOutput(stream)) {
    stream.write(`${stripAnsi(message)}\n`);
    return;
  }

  const options = { output: getRendererOutput(stream) };
  switch (method) {
    case 'error':
      render.error(message, options);
      return;
    case 'warn':
      render.warn(message, options);
      return;
    case 'info':
      render.info(message, options);
      return;
    case 'success':
      render.success(message, options);
      return;
    default:
      render.message(dim(message), options);
  }
}
