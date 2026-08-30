import type { ListComponentHandlerOptions } from '@emulsify-cli/handlers';
import log from '../lib/log.js';
import { withEmulsifySystem } from './hofs/withEmulsifySystem.js';

/**
 * Handler for the `component list` command.
 *
 * @throws {CliError} if the current project does not have a usable system and variant configuration.
 */
export default async function componentList({
  refresh,
}: ListComponentHandlerOptions = {}): Promise<void> {
  // Load the configured system and variant before printing available components.
  const { variantConf } = await withEmulsifySystem('list components', {
    refresh,
  });

  variantConf.components.map(({ name, structure }) => {
    log('info', `${structure} -> ${name}`);
  });
}
