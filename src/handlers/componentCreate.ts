import type { CreateComponentHandlerOptions } from '@emulsify-cli/handlers';
import { text } from '@clack/prompts';
import generateComponent from '../util/project/generateComponent.js';
import { withEmulsifySystem } from './hofs/withEmulsifySystem.js';
import CliError from '../lib/CliError.js';
import deriveComponentNames from '../util/deriveComponentNames.js';
import {
  isPromptCancelledError,
  requireInteractiveTerminal,
  runPrompt,
} from '../util/prompt/index.js';
import {
  MISSING_COMPONENT_DIRECTORY_ERROR,
  MISSING_COMPONENT_TYPE_ERROR,
} from '../util/project/componentTypes.js';

const MISSING_COMPONENT_NAME_ERROR =
  'Please specify a name for the new component.';

function validateComponentName(name: string | undefined): string | undefined {
  try {
    deriveComponentNames(name ?? '');
    return undefined;
  } catch (error) {
    return (error as Error).message;
  }
}

/**
 * Handler for the `component create` command.
 *
 * @returns summary shown on the closing line of the session.
 *
 * @throws {CliError} if the component name is missing.
 * @throws {CliError} if the current project does not have a usable system and variant configuration.
 * @throws {CliError} if component generation fails.
 */
export default async function componentCreate(
  name: string | void,
  options: CreateComponentHandlerOptions = {},
): Promise<string> {
  const providedComponentName = name?.trim() ? name : undefined;

  // Missing prompt values can be rejected before loading or refreshing the
  // configured system, keeping CI failures fast and offline.
  if (!providedComponentName) {
    requireInteractiveTerminal(MISSING_COMPONENT_NAME_ERROR);
  }
  if (!options.type && !options.format) {
    requireInteractiveTerminal(MISSING_COMPONENT_TYPE_ERROR);
  }
  if (!options.directory) {
    requireInteractiveTerminal(MISSING_COMPONENT_DIRECTORY_ERROR);
  }

  // Load the configured system and variant before generating the local component.
  const { emulsifyConfig, variantConf } = await withEmulsifySystem(
    'create components',
    {
      refresh: options.refresh,
    },
  );

  const componentName =
    providedComponentName ??
    (await runPrompt<string>({
      prompt: () =>
        text({
          message: 'Component name',
          validate: validateComponentName,
        }),
      nonInteractive: { error: MISSING_COMPONENT_NAME_ERROR },
    }));

  try {
    // generateComponent reports the outcome it actually reached, which may be a
    // declined overwrite rather than a new component.
    return await generateComponent(
      variantConf,
      emulsifyConfig,
      componentName,
      options,
    );
  } catch (e) {
    // A cancelled prompt is closed by the top-level runner, which reports it as
    // a cancellation rather than a failure. Wrapping it here would hide it.
    if (isPromptCancelledError(e)) {
      throw e;
    }

    const msg = e instanceof Error ? e.message : String(e);
    throw new CliError(
      `Unable to create the ${componentName} component: ${msg}`,
    );
  }
}
