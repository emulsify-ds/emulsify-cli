jest.mock('../../lib/log', () => jest.fn());

import CliError from '../../lib/CliError.js';
import log from '../../lib/log.js';
import validateSystemConfig from './validateSystemConfig.js';

const { version: runningVersion } = jest.requireActual<
  typeof import('../../../package.json')
>('../../../package.json');
const stableVersion = runningVersion.split(/[-+]/, 1)[0];
const [major, minor, patch] = stableVersion.split('.').map(Number);
const newerVersion = `${major + 1}.0.0`;

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
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns a typed system configuration without a minimum CLI version', async () => {
    await expect(validateSystemConfig(validSystem)).resolves.toEqual({
      valid: true,
      systemConfig: validSystem,
    });
  });

  it('accepts unknown properties and warns once with their locations', async () => {
    const [variant] = validSystem.variants;
    const system = {
      ...validSystem,
      futureSystemSetting: true,
      variants: [
        {
          ...variant,
          futureVariantSetting: true,
          structureImplementations: [
            {
              ...variant.structureImplementations[0],
              futureStructureSetting: true,
            },
          ],
          components: [
            {
              name: 'slider',
              structure: 'base',
              npmDependencies: { swiper: '^12.0.0' },
              futureComponentSetting: true,
            },
          ],
          directories: [
            {
              name: 'fonts',
              path: 'fonts',
              destinationPath: 'assets/fonts',
              futureDirectorySetting: true,
            },
          ],
          files: [
            {
              name: 'config',
              path: 'config.json',
              destinationPath: 'assets/config.json',
              futureFileSetting: true,
            },
          ],
        },
      ],
    };

    await expect(validateSystemConfig(system)).resolves.toEqual({
      valid: true,
      systemConfig: system,
    });

    expect(log).toHaveBeenCalledTimes(1);
    const [[level, warning]] = jest.mocked(log).mock.calls;
    expect(level).toBe('warn');
    for (const detail of [
      'system: futureSystemSetting',
      'variant[0] ("drupal"): futureVariantSetting',
      'structure implementation "base": futureStructureSetting',
      'component "slider": futureComponentSetting',
      'directory "fonts": futureDirectorySetting',
      'file "config": futureFileSetting',
      'npm i -g @emulsify/cli@latest',
    ]) {
      expect(warning).toContain(detail);
    }
    expect(warning).not.toContain('npmDependencies');
  });

  it('still rejects malformed component fields alongside unknown properties', async () => {
    const result = await validateSystemConfig({
      ...validSystem,
      variants: [
        {
          ...validSystem.variants[0],
          components: [
            { name: 'slider', structure: 42, futureComponentSetting: true },
          ],
        },
      ],
    });

    expect(result).toEqual({
      valid: false,
      errors: expect.arrayContaining([
        expect.objectContaining({
          instancePath: '/variants/0/components/0/structure',
          keyword: 'type',
          params: { type: 'string' },
        }),
      ]),
    });
    expect(log).not.toHaveBeenCalled();
  });

  it('still validates the values of declared npm dependencies', async () => {
    const result = await validateSystemConfig({
      ...validSystem,
      variants: [
        {
          ...validSystem.variants[0],
          components: [
            {
              name: 'slider',
              structure: 'base',
              npmDependencies: { swiper: 12 },
            },
          ],
        },
      ],
    });

    expect(result).toEqual({
      valid: false,
      errors: expect.arrayContaining([
        expect.objectContaining({
          instancePath: '/variants/0/components/0/npmDependencies/swiper',
          keyword: 'type',
        }),
      ]),
    });
  });

  it.each([
    newerVersion,
    `${major}.${minor + 10}.0`,
    `${major}.${minor}.${patch + 1}-beta.1`,
  ])(
    'reports an actionable CliError for minimum CLI version %s',
    async (minimumCliVersion) => {
      const validation = validateSystemConfig({
        ...validSystem,
        minimumCliVersion,
      });

      await expect(validation).rejects.toBeInstanceOf(CliError);
      await expect(validation).rejects.toThrow(
        `The "compound" system requires Emulsify CLI ${minimumCliVersion} or newer. You are running ${runningVersion}. Upgrade with: npm i -g @emulsify/cli@latest`,
      );
    },
  );

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
