import type { EmulsifySystem } from '@emulsify-cli/config';

import { Ajv, type ErrorObject } from 'ajv';
import addFormats from 'ajv-formats';
import { lt, valid } from 'semver';
import CliError from '../../lib/CliError.js';
import log from '../../lib/log.js';

const upgradeCommand = 'npm i -g @emulsify/cli@latest';

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
    schemas: { systemSchema, variantSchema },
    runningVersion: packageInfo.version,
  };
}

let validatorPromise: ReturnType<typeof createValidator> | undefined;

function warnUnknownProperties(
  systemConfig: EmulsifySystem,
  {
    systemSchema,
    variantSchema,
  }: Awaited<ReturnType<typeof createValidator>>['schemas'],
) {
  const unknown: string[] = [];
  const collect = (value: object, properties: object, location: string) => {
    const keys = Object.keys(value).filter(
      (key) => !Object.hasOwn(properties, key),
    );
    if (keys.length > 0) {
      unknown.push(`${location}: ${keys.join(', ')}`);
    }
  };

  collect(systemConfig, systemSchema.properties, 'system');
  const variantProperties =
    systemSchema.properties.variants.items.anyOf[0].properties;
  const items = [
    ['structureImplementations', 'structure implementation'],
    ['components', 'component'],
    ['directories', 'directory'],
    ['files', 'file'],
  ] as const;

  for (const [index, variant] of (systemConfig.variants ?? []).entries()) {
    const location = `variant[${index}] (${JSON.stringify(variant.platform)})`;
    collect(variant, variantProperties, location);
    for (const [key, label] of items) {
      for (const item of variant[key] ?? []) {
        collect(
          item,
          variantSchema.definitions[key].items.properties,
          `${location} ${label} ${JSON.stringify(item.name)}`,
        );
      }
    }
  }

  if (unknown.length > 0) {
    log(
      'warn',
      `This system uses configuration this version of Emulsify CLI does not understand (${unknown.join('; ')}). Upgrade with \`${upgradeCommand}\` if the system is not behaving as documented.`,
    );
  }
}

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
  const { validate, schemas, runningVersion } = await (validatorPromise ??=
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
        `The ${JSON.stringify(name)} system requires Emulsify CLI ${minimumCliVersion} or newer. You are running ${runningVersion}. Upgrade with: ${upgradeCommand}`,
      );
    }
    warnUnknownProperties(systemConfig, schemas);
    return { valid: true, systemConfig };
  }

  return { valid: false, errors: validate.errors };
}
