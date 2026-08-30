import type { CreateComponentHandlerOptions } from '@emulsify-cli/handlers';
import { input } from '@inquirer/prompts';
import generateComponent from '../util/project/generateComponent.js';
import { withEmulsifySystem } from './hofs/withEmulsifySystem.js';
import CliError from '../lib/CliError.js';
import deriveComponentNames from '../util/deriveComponentNames.js';
import { isExitPromptError, runPrompt } from '../util/prompt/index.js';

const MISSING_COMPONENT_NAME_ERROR =
  'Please specify a name for the new component.';

function validateComponentName(name: string): true | string {
  try {
    deriveComponentNames(name);
    return true;
  } catch (error) {
    return (error as Error).message;
  }
}

/**
 * Handler for the `component create` command.
 *
 * @throws {CliError} if the component name is missing.
 * @throws {CliError} if the current project does not have a usable system and variant configuration.
 * @throws {CliError} if component generation fails.
 */
export default async function componentCreate(
  name: string | void,
  options: CreateComponentHandlerOptions = {},
): Promise<void> {
  const componentName = name?.trim()
    ? name
    : await runPrompt({
        prompt: () =>
          input({
            message: 'Component name:',
            validate: validateComponentName,
          }),
        nonInteractive: { error: MISSING_COMPONENT_NAME_ERROR },
      });

  // Load the configured system and variant before generating the local component.
  const { variantConf } = await withEmulsifySystem('create components', {
    refresh: options.refresh,
  });

  try {
    await generateComponent(variantConf, componentName, options);
  } catch (e) {
    if (isExitPromptError(e)) {
      throw e;
    }

    const msg = e instanceof Error ? e.message : String(e);
    throw new CliError(
      `Unable to create the ${componentName} component: ${msg}`,
    );
  }
}
