import CliError from '../../lib/CliError.js';
import validateSystemConfig from './validateSystemConfig.js';

const { version: runningVersion } = jest.requireActual<
  typeof import('../../../package.json')
>('../../../package.json');
const stableVersion = runningVersion.split(/[-+]/, 1)[0];
const newerVersion = `${Number.parseInt(runningVersion, 10) + 1}.0.0`;

const validSystem = {
  name: 'compound',
  homepage: 'https://example.com/compound',
  repository: 'https://github.com/emulsify-ds/compound.git',
  structure: [
    {
      name: 'base',
      description: 'Base components',
    },
  ],
  variants: [
    {
      platform: 'drupal',
      structureImplementations: [
        {
          name: 'base',
          directory: 'components/00-base',
        },
      ],
      components: [],
    },
  ],
};

describe('validateSystemConfig', () => {
  it('returns a typed system configuration without a minimum CLI version', async () => {
    await expect(validateSystemConfig(validSystem)).resolves.toEqual({
      valid: true,
      systemConfig: validSystem,
    });
  });

  it('reports an actionable CliError when a system needs a newer CLI', async () => {
    const validation = validateSystemConfig({
      ...validSystem,
      minimumCliVersion: newerVersion,
    });

    await expect(validation).rejects.toBeInstanceOf(CliError);
    await expect(validation).rejects.toThrow(
      `The "compound" system requires Emulsify CLI ${newerVersion} or newer. You are running ${runningVersion}. Upgrade with: npm i -g @emulsify/cli@latest`,
    );
  });

  it.each(['1.0.0', stableVersion, `${stableVersion}-beta.1`])(
    'accepts the minimum CLI version %s',
    async (minimumCliVersion) => {
      const systemConfig = { ...validSystem, minimumCliVersion };

      await expect(validateSystemConfig(systemConfig)).resolves.toEqual({
        valid: true,
        systemConfig,
      });
    },
  );

  it('accepts a CLI prerelease with the required major, minor, and patch versions', async () => {
    await jest.isolateModulesAsync(async () => {
      jest.doMock('../../../package.json', () => ({
        version: `${newerVersion}-beta.1`,
      }));
      try {
        const { default: validateConfig } =
          await import('./validateSystemConfig.js');
        const systemConfig = {
          ...validSystem,
          minimumCliVersion: newerVersion,
        };

        await expect(validateConfig(systemConfig)).resolves.toEqual({
          valid: true,
          systemConfig,
        });
      } finally {
        jest.dontMock('../../../package.json');
      }
    });
  });

  it.each(['^2.5.0', '2.5', 2.5])(
    'rejects an invalid minimum CLI version %j',
    async (minimumCliVersion) => {
      await expect(
        validateSystemConfig({ ...validSystem, minimumCliVersion }),
      ).resolves.toEqual({
        valid: false,
        errors: expect.arrayContaining([
          expect.objectContaining({ instancePath: '/minimumCliVersion' }),
        ]),
      });
    },
  );

  it('returns Ajv errors when validation fails', async () => {
    const result = await validateSystemConfig({
      ...validSystem,
      homepage: 'not-a-uri',
    });

    expect(result).toEqual({
      valid: false,
      errors: expect.arrayContaining([
        expect.objectContaining({
          instancePath: '/homepage',
          keyword: 'format',
        }),
      ]),
    });
  });

  it('rejects variants that omit required components', async () => {
    const [{ components: _components, ...variant }] = validSystem.variants;
    const result = await validateSystemConfig({
      ...validSystem,
      variants: [variant],
    });

    expect(result).toEqual({
      valid: false,
      errors: expect.arrayContaining([
        expect.objectContaining({
          instancePath: '/variants/0',
          keyword: 'required',
          params: { missingProperty: 'components' },
        }),
      ]),
    });
  });
});
