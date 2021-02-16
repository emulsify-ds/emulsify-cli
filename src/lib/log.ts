/**
 * @file log.ts
 * Exports methods that MUST be used when writing to the console.
 */

import { Chalk, dim, cyan, yellow, green, white } from 'chalk';
import R from 'ramda';

export type LogMethod =
  | 'info'
  | 'error'
  | 'warn'
  | 'debug'
  | 'verbose'
  | 'success';

const logMethodColorMap: {
  [name in LogMethod]: Chalk;
} = {
  info: cyan,
  error: white.bgRed.bold,
  warn: yellow.bold,
  debug: dim,
  verbose: dim,
  success: green,
};

const withColor = (
  logger: Console['log'] | Console['info'] | Console['error']
) => (method: LogMethod, message: string): void =>
  /* eslint-disable-next-line security/detect-object-injection */
  logger(logMethodColorMap[method](message));

const logMethodEq = (potentialMethod: LogMethod) => (
  method: LogMethod,
  _: string
): boolean => potentialMethod === method;

/**
 * Lib function that allows for info, error, warn, debug, verbose, and success messages
 * to be written to the console with consistent methods and colors.
 *
 * @param message string containing message to be logged.
 * @param method method that should be used to log, such as 'error', or 'warn'.
 */
export default function log(method: LogMethod, message: string): void {
  // @TODO: add support for --verbose flag, and suppress verbose messages
  // by default when --verbose is false or void.

  // emit log message based off of method.
  R.cond([
    [logMethodEq('error'), withColor(console.error)],
    [logMethodEq('info'), withColor(console.info)],
    [logMethodEq('warn'), withColor(console.warn)],
    [R.T, withColor(console.log)],
  ])(method, message);

  return;
}
