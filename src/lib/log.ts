/**
 * @file log.ts
 * Exports methods that MUST be used when writing to the console.
 */

import { cyan, red, yellow, green, dim, bold } from 'colorette';
import consolaGlobalInstance, { type ConsolaInstance } from 'consola';

export type LogMethod =
  | 'info'
  | 'error'
  | 'warn'
  | 'debug'
  | 'verbose'
  | 'success';

const logMethodColorMap: {
  [name in LogMethod]: (message: string) => string;
} = {
  info: cyan,
  error: (message: string) => bold(red(message)),
  warn: (message: string) => bold(yellow(message)),
  debug: dim,
  verbose: dim,
  success: green,
};

const withColor =
  (logger: ConsolaInstance['log']) =>
  (method: LogMethod, message: string): void =>
    logger(logMethodColorMap[method](message));

/**
 * Lib function that allows for info, error, warn, debug, verbose, and success messages
 * to be written to the console with consistent methods and colors. This function
 * only writes log output and never exits the process.
 *
 * @param method method that should be used to log, such as 'error', or 'warn'.
 * @param message string containing message to be logged.
 */
export default function log(method: LogMethod, message: string): void {
  // @TODO: add support for --verbose flag, and suppress verbose messages
  // by default when --verbose is false or void.

  // emit log message based off of method.
  switch (method) {
    case 'error':
      withColor(consolaGlobalInstance.error)(method, message);
      break;
    case 'info':
      withColor(consolaGlobalInstance.info)(method, message);
      break;
    case 'warn':
      withColor(consolaGlobalInstance.warn)(method, message);
      break;
    default:
      withColor(consolaGlobalInstance.log)(method, message);
  }

  return;
}
