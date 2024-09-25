/**
 * @file log.ts
 * Exports methods that MUST be used when writing to the console.
 */

import { cyan, red, yellow, green, dim, bold } from 'colorette';
import R from 'ramda';
import consolaGlobalInstance, { Consola } from 'consola';

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
  (logger: Consola['log'] | Consola['info'] | Consola['error']) =>
  (method: LogMethod, message: string): void =>
    /* eslint-disable-next-line security/detect-object-injection */
    logger(logMethodColorMap[method](message));

const logMethodEq =
  (potentialMethod: LogMethod) =>
  (method: LogMethod, _: string): boolean =>
    potentialMethod === method;

/**
 * Lib function that allows for info, error, warn, debug, verbose, and success messages
 * to be written to the console with consistent methods and colors.
 *
 * @param message string containing message to be logged.
 * @param method method that should be used to log, such as 'error', or 'warn'.
 */
export default function log(
  method: LogMethod,
  message: string,
  exitCode?: number,
): void {
  // @TODO: add support for --verbose flag, and suppress verbose messages
  // by default when --verbose is false or void.

  // emit log message based off of method.
  R.cond([
    [logMethodEq('error'), withColor(consolaGlobalInstance.error)],
    [logMethodEq('info'), withColor(consolaGlobalInstance.info)],
    [logMethodEq('warn'), withColor(consolaGlobalInstance.warn)],
    [R.T, withColor(consolaGlobalInstance.log)],
  ])(method, message);

  if (exitCode) {
    process.exit(exitCode);
  }

  return;
}
