import log from '../lib/log.js';
import type { CreateComponentHandlerOptions } from '@emulsify-cli/handlers';
import generateComponent from '../util/project/generateComponent.js';
import { withEmulsifySystem } from './hofs/withEmulsifySystem.js';
import CliError from '../lib/CliError.js';

/**
 * Handler for the `component create` command.
 *
 * @throws {CliError} if the current project does not have a usable system and variant configuration.
 * @throws {CliError} if component generation fails.
 */
export default async function componentCreate(
  name: string,
  options: CreateComponentHandlerOptions = {},
): Promise<void> {
  if (!name?.trim()) {
    return log('error', 'Please specify a name for the new component.');
  }

  // Load the configured system and variant before generating the local component.
  const { variantConf } = await withEmulsifySystem('create components');

  try {
    await generateComponent(variantConf, name, options);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new CliError(`Unable to create the ${name} component: ${msg}`);
  }
}
