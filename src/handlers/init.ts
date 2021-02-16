import log from '../lib/log';

/**
 * Handler for the init command.
 */
export default function init(name: string, path?: string): void {
  log('error', `Initializing ${name} Emulsify project in ${String(path)}`);
}
