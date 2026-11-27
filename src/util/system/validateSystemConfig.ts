import type { EmulsifySystem } from '@emulsify-cli/config';

import { Ajv, type ErrorObject } from 'ajv';
import addFormats from 'ajv-formats';
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

async function loadSchemas() {
  const [{ default: systemSchema }, { default: variantSchema }] =
    await Promise.all([
      import('../../schemas/system.json', { with: { type: 'json' } }),
      import('../../schemas/variant.json', { with: { type: 'json' } }),
    ]);

  return { systemSchema, variantSchema };
}

async function createValidator() {
  const [schemas, { default: packageInfo }] = await Promise.all([
    loadSchemas(),
    import('../../../package.json', { with: { type: 'json' } }),
  ]);
  const ajv = new Ajv();
  // This is unfortunate...
  // @ts-ignore The ajv-formats typing is bad :(
  addFormats(ajv, ['uri']);
  ajv.addSchema(schemas.variantSchema, 'variant.json');
  return {
    validate: ajv.compile<EmulsifySystem>(schemas.systemSchema),
    schemas,
    runningVersion: packageInfo.version,
  };
}

let validatorPromise: ReturnType<typeof createValidator> | undefined;

function checkMinimumCliVersion(
  { name, minimumCliVersion }: EmulsifySystem,
  runningVersion: string,
) {
  if (minimumCliVersion === undefined) return;

  const minimum = minimumCliVersion.match(/^(\d+)\.(\d+)\.(\d+)(?:[-+].+)?$/);
  if (!minimum) {
    throw new CliError(
      `The ${JSON.stringify(name)} system has an invalid minimumCliVersion ${JSON.stringify(minimumCliVersion)}. Use a version such as "2.5.0".`,
    );
  }

  const running = runningVersion.split(/[.+-]/, 3).map(Number);
  const required = minimum.slice(1).map(Number);
  const index = required.findIndex((part, i) => part !== running[i]);
  if (index !== -1 && running[index] < required[index]) {
    throw new CliError(
      `The ${JSON.stringify(name)} system requires Emulsify CLI ${minimumCliVersion} or newer. You are running ${runningVersion}. Upgrade with: ${upgradeCommand}`,
    );
  }
}

function warnUnknownProperties(
  systemConfig: EmulsifySystem,
  { systemSchema, variantSchema }: Awaited<ReturnType<typeof loadSchemas>>,
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
 * @throws {CliError} if the configuration declares an invalid or unmet CLI version requirement.
 */
export default async function validateSystemConfig(
  systemConfig: unknown,
): Promise<SystemConfigValidationResult> {
  const { validate, schemas, runningVersion } = await (validatorPromise ??=
    createValidator());
  if (validate(systemConfig)) {
    checkMinimumCliVersion(systemConfig, runningVersion);
    warnUnknownProperties(systemConfig, schemas);
    return { valid: true, systemConfig };
  }

  return { valid: false, errors: validate.errors };
}
