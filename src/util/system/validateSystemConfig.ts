import type { EmulsifySystem } from '@emulsify-cli/config';

import { Ajv, type ErrorObject } from 'ajv';
import addFormats from 'ajv-formats';
import { lt, valid } from 'semver';
import CliError from '../../lib/CliError.js';

export type SystemConfigValidationResult =
  | {
      valid: true;
      systemConfig: EmulsifySystem;
    }
  | {
      valid: false;
      errors: ErrorObject[] | null | undefined;
    };

async function createValidator() {
  const [
    { default: systemSchema },
    { default: variantSchema },
    { default: packageInfo },
  ] = await Promise.all([
    import('../../schemas/system.json', { with: { type: 'json' } }),
    import('../../schemas/variant.json', { with: { type: 'json' } }),
    import('../../../package.json', { with: { type: 'json' } }),
  ]);
  const ajv = new Ajv();
  // @ts-ignore The ajv-formats typing is bad :(
  addFormats(ajv, ['uri']);
  ajv.addFormat('semver', (value: string) => valid(value) !== null);
  ajv.addSchema(variantSchema, 'variant.json');
  return {
    validate: ajv.compile<EmulsifySystem>(systemSchema),
    runningVersion: packageInfo.version,
  };
}

let validatorPromise: ReturnType<typeof createValidator> | undefined;

/**
 * Validate a loaded Emulsify system configuration with the shared schemas.
 *
 * @param systemConfig loaded JSON value to validate.
 * @returns a valid typed system configuration or the Ajv validation errors.
 * @throws {CliError} if the running CLI is older than the system's minimum.
 */
export default async function validateSystemConfig(
  systemConfig: unknown,
): Promise<SystemConfigValidationResult> {
  const { validate, runningVersion } = await (validatorPromise ??=
    createValidator());
  if (validate(systemConfig)) {
    const { name, minimumCliVersion } = systemConfig;
    if (
      minimumCliVersion !== undefined &&
      lt(
        runningVersion.split(/[+-]/, 1)[0],
        minimumCliVersion.split(/[+-]/, 1)[0],
      )
    ) {
      throw new CliError(
        `The ${JSON.stringify(name)} system requires Emulsify CLI ${minimumCliVersion} or newer. You are running ${runningVersion}. Upgrade with: npm i -g @emulsify/cli@latest`,
      );
    }
    return { valid: true, systemConfig };
  }

  return { valid: false, errors: validate.errors };
}
