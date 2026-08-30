import validateSystemConfig from './validateSystemConfig.js';

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
  it('returns a typed system configuration when validation succeeds', async () => {
    await expect(validateSystemConfig(validSystem)).resolves.toEqual({
      valid: true,
      systemConfig: validSystem,
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
