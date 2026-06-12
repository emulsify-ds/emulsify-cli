import type { EmulsifyProjectConfiguration } from '@emulsify-cli/config';
import { Ajv, type ErrorObject, type ValidateFunction } from 'ajv';
import { EMULSIFY_PROJECT_CONFIG_FILE } from '../../lib/constants.js';
import findFileInCurrentPath from '../fs/findFileInCurrentPath.js';
import loadJsonFile from '../fs/loadJsonFile.js';

let validateProjectConfig: ValidateFunction | undefined;

async function getProjectConfigValidator(): Promise<ValidateFunction> {
  if (!validateProjectConfig) {
    const [{ default: projectConfigSchema }, { default: variantSchema }] =
      await Promise.all([
        import('../../schemas/emulsifyProjectConfig.json', {
          with: { type: 'json' },
        }),
        import('../../schemas/variant.json', { with: { type: 'json' } }),
      ]);
    const ajv = new Ajv({ allErrors: true });
    ajv.addSchema(variantSchema, 'variant.json');
    validateProjectConfig = ajv.compile(projectConfigSchema);
  }

  return validateProjectConfig;
}

function formatProjectConfigError(error: ErrorObject): string {
  const location = error.instancePath || '/';
  return `${location} ${error.message}`;
}

async function validateEmulsifyConfig(
  config: unknown,
  path: string,
): Promise<EmulsifyProjectConfiguration> {
  const validate = await getProjectConfigValidator();
  if (!validate(config)) {
    const errors = (validate.errors || [])
      .map(formatProjectConfigError)
      .join('; ');

    throw new Error(
      `Invalid Emulsify project configuration in "${path}": ${errors}`,
    );
  }

  return config as EmulsifyProjectConfiguration;
}

/**
 * Finds the Emulsify project configuration, loads, and returns it.
 *
 * @returns Configuration for the current Emulsify project (within the current pwd), or undefined if none exists.
 */
export default async function getEmulsifyConfig(): Promise<EmulsifyProjectConfiguration | void> {
  const path = findFileInCurrentPath(EMULSIFY_PROJECT_CONFIG_FILE);

  if (!path) {
    return undefined;
  }

  const config = await loadJsonFile<unknown>(path);
  if (config === undefined) {
    return undefined;
  }

  return validateEmulsifyConfig(config, path);
}
