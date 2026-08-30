/**
 * @file log.ts
 * Exports methods that MUST be used when writing to the console.
 */

import consolaGlobalInstance, { type ConsolaInstance } from 'consola';
import getTerminalColors from './terminalColors.js';

export type LogMethod =
  'info' | 'error' | 'warn' | 'debug' | 'verbose' | 'success';

const withColor =
  (logger: ConsolaInstance['log']) =>
  (method: LogMethod, message: string): void => {
    const { bold, cyan, dim, green, red, yellow } = getTerminalColors();
    const logMethodColorMap: {
      [name in LogMethod]: (value: string) => string;
    } = {
      info: cyan,
      error: (value: string) => bold(red(value)),
      warn: (value: string) => bold(yellow(value)),
      debug: dim,
      verbose: dim,
      success: green,
    };

    logger(logMethodColorMap[method](message));
  };

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
