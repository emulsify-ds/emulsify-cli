jest.mock('../../lib/log', () => jest.fn());

import CliError from '../../lib/CliError.js';
import log from '../../lib/log.js';
import validateSystemConfig from './validateSystemConfig.js';

const { version }: { version: string } = jest.requireActual(
  '../../../package.json',
);
const [major, minor, patch] = version
  .split('.')
  .map((part) => Number.parseInt(part, 10));

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

  it('returns a typed system configuration when validation succeeds', async () => {
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
      'component "slider": npmDependencies',
      'directory "fonts": futureDirectorySetting',
      'file "config": futureFileSetting',
      'npm i -g @emulsify/cli@latest',
    ]) {
      expect(warning).toContain(detail);
    }
  });

  it('still rejects malformed component fields alongside unknown properties', async () => {
    const result = await validateSystemConfig({
      ...validSystem,
      variants: [
        {
          ...validSystem.variants[0],
          components: [{ name: 'slider', structure: 42, npmDependencies: {} }],
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

  it.each([
    `${major + 1}.0.0`,
    `${major}.${minor + 10}.0`,
    `${major}.${minor}.${patch + 1}-beta.1`,
  ])(
    'throws an actionable CliError for minimum CLI version %s',
    async (minimumCliVersion) => {
      const result = validateSystemConfig({
        ...validSystem,
        minimumCliVersion,
      });

      await expect(result).rejects.toBeInstanceOf(CliError);
      await expect(result).rejects.toThrow(
        `The "compound" system requires Emulsify CLI ${minimumCliVersion} or newer. You are running ${version}. Upgrade with: npm i -g @emulsify/cli@latest`,
      );
    },
  );

  it.each(['0.0.0', version, `${major}.${minor}.${patch}-beta.1`])(
    'accepts minimum CLI version %s',
    async (minimumCliVersion) => {
      const system = { ...validSystem, minimumCliVersion };

      await expect(validateSystemConfig(system)).resolves.toEqual({
        valid: true,
        systemConfig: system,
      });
      expect(log).not.toHaveBeenCalled();
    },
  );

  it('explains how to fix an invalid minimum CLI version', async () => {
    const result = validateSystemConfig({
      ...validSystem,
      minimumCliVersion: '2.5',
    });

    await expect(result).rejects.toBeInstanceOf(CliError);
    await expect(result).rejects.toThrow(
      'invalid minimumCliVersion "2.5". Use a version such as "2.5.0".',
    );
  });

  it('returns an Ajv type error for a non-string minimum CLI version', async () => {
    const result = await validateSystemConfig({
      ...validSystem,
      minimumCliVersion: 2.5,
    });

    expect(result).toEqual({
      valid: false,
      errors: expect.arrayContaining([
        expect.objectContaining({
          instancePath: '/minimumCliVersion',
          keyword: 'type',
          params: { type: 'string' },
        }),
      ]),
    });
  });

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
