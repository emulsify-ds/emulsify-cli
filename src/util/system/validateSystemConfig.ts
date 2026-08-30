import type { EmulsifySystem } from '@emulsify-cli/config';

import { Ajv, type ErrorObject, type ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';

export type SystemConfigValidationResult =
  | {
      valid: true;
      systemConfig: EmulsifySystem;
    }
  | {
      valid: false;
      errors: ErrorObject[] | null | undefined;
    };

async function loadSchemas() {
  const [{ default: systemSchema }, { default: variantSchema }] =
    await Promise.all([
      import('../../schemas/system.json', { with: { type: 'json' } }),
      import('../../schemas/variant.json', { with: { type: 'json' } }),
    ]);

  return { systemSchema, variantSchema };
}

let validatorPromise: Promise<ValidateFunction<EmulsifySystem>> | undefined;

async function getValidator(): Promise<ValidateFunction<EmulsifySystem>> {
  if (!validatorPromise) {
    validatorPromise = loadSchemas().then(({ systemSchema, variantSchema }) => {
      const ajv = new Ajv();
      // This is unfortunate...
      // @ts-ignore The ajv-formats typing is bad :(
      addFormats(ajv, ['uri']);
      ajv.addSchema(variantSchema, 'variant.json');
      return ajv.compile<EmulsifySystem>(systemSchema);
    });
  }

  return validatorPromise;
}

/**
 * Validate a loaded Emulsify system configuration with the shared schemas.
 *
 * @param systemConfig loaded JSON value to validate.
 * @returns a valid typed system configuration or the Ajv validation errors.
 */
export default async function validateSystemConfig(
  systemConfig: unknown,
): Promise<SystemConfigValidationResult> {
  const validate = await getValidator();
  if (validate(systemConfig)) {
    return { valid: true, systemConfig };
  }

  return { valid: false, errors: validate.errors };
}
