import type { EmulsifySystem, EmulsifyVariant } from '@emulsify-cli/config';

import { resolve } from 'path';
import buildSystemInstallPlan from './buildSystemInstallPlan.js';

const projectConfigPath = resolve('/project/project.emulsify.json');

const button = {
  name: 'button',
  structure: 'base',
  required: true,
};
const icon = {
  name: 'icon',
  structure: 'base',
  required: true,
};
const card = {
  name: 'card',
  structure: 'layout',
};

function buildVariant(
  overrides: Partial<EmulsifyVariant> = {},
): EmulsifyVariant {
  return {
    platform: 'drupal',
    structureImplementations: [
      { name: 'base', directory: 'components/00-base' },
      { name: 'layout', directory: 'components/01-layout' },
    ],
    components: [button, icon, card],
    ...overrides,
  };
}

function buildSystem(
  variant: EmulsifyVariant,
  overrides: Partial<EmulsifySystem> = {},
): EmulsifySystem {
  return {
    name: 'compound',
    homepage: 'https://example.com/compound',
    repository: 'https://github.com/emulsify-ds/compound.git',
    structure: [
      { name: 'base', description: 'Base components' },
      { name: 'layout', description: 'Layout components' },
    ],
    variants: [variant],
    ...overrides,
  };
}

describe('buildSystemInstallPlan', () => {
  it('selects exact required component objects and reports required and total counts', () => {
    const variant = buildVariant();
    const plan = buildSystemInstallPlan(
      buildSystem(variant),
      variant,
      false,
      projectConfigPath,
    );

    expect(plan).toEqual({
      components: [button, icon],
      requiredComponentCount: 2,
      totalComponentCount: 3,
      componentParentDestinations: ['components/00-base'],
      directoryAssetDestinations: [],
      fileAssetDestinations: [],
      directoryAssetCount: 0,
      fileAssetCount: 0,
      totalAssetCount: 0,
    });
    expect(plan.components[0]).toBe(button);
    expect(plan.components[1]).toBe(icon);
  });

  it('selects all component objects while preserving config order', () => {
    const variant = buildVariant();
    const plan = buildSystemInstallPlan(
      buildSystem(variant),
      variant,
      true,
      projectConfigPath,
    );

    expect(plan.components).toEqual([button, icon, card]);
    expect(plan.components[0]).toBe(button);
    expect(plan.components[1]).toBe(icon);
    expect(plan.components[2]).toBe(card);
    expect(plan.requiredComponentCount).toBe(2);
    expect(plan.totalComponentCount).toBe(3);
    expect(plan.componentParentDestinations).toEqual([
      'components/00-base',
      'components/01-layout',
    ]);
  });

  it('returns an empty selection when no components are required', () => {
    const variant = buildVariant({
      components: [card],
      directories: [],
      files: [],
    });
    const plan = buildSystemInstallPlan(
      buildSystem(variant),
      variant,
      false,
      projectConfigPath,
    );

    expect(plan.components).toEqual([]);
    expect(plan.requiredComponentCount).toBe(0);
    expect(plan.totalComponentCount).toBe(1);
    expect(plan.componentParentDestinations).toEqual([]);
    expect(plan.totalAssetCount).toBe(0);
  });

  it('deduplicates component parents across structures in first-seen order', () => {
    const firstLayout = {
      name: 'hero',
      structure: 'layout',
      required: true,
    };
    const firstBase = {
      name: 'link',
      structure: 'base',
      required: true,
    };
    const secondLayout = {
      name: 'grid',
      structure: 'layout',
      required: true,
    };
    const variant = buildVariant({
      structureImplementations: [
        { name: 'base', directory: 'src/components/base' },
        { name: 'layout', directory: 'src/components/layout' },
      ],
      components: [firstLayout, firstBase, secondLayout],
    });
    const plan = buildSystemInstallPlan(
      buildSystem(variant),
      variant,
      false,
      projectConfigPath,
    );

    expect(plan.components).toEqual([firstLayout, firstBase, secondLayout]);
    expect(plan.componentParentDestinations).toEqual([
      'src/components/layout',
      'src/components/base',
    ]);
  });

  it('displays the project root when it is the component parent', () => {
    const variant = buildVariant({
      structureImplementations: [{ name: 'base', directory: '.' }],
      components: [button],
    });

    expect(
      buildSystemInstallPlan(
        buildSystem(variant),
        variant,
        false,
        projectConfigPath,
      ).componentParentDestinations,
    ).toEqual(['.']);
  });

  it('returns unique directory and file display destinations with raw asset counts', () => {
    const variant = buildVariant({
      directories: [
        {
          name: 'fonts',
          path: 'assets/fonts',
          destinationPath: 'public/fonts',
        },
        {
          name: 'font aliases',
          path: 'assets/font-aliases',
          destinationPath: 'public/fonts/',
        },
        {
          name: 'images',
          path: 'assets/images',
          destinationPath: 'public/images',
        },
      ],
      files: [
        {
          name: 'tokens',
          path: 'assets/tokens.json',
          destinationPath: 'public/tokens.json',
        },
        {
          name: 'token aliases',
          path: 'assets/token-aliases.json',
          destinationPath: 'public/tokens.json',
        },
        {
          name: 'manifest',
          path: 'assets/manifest.json',
          destinationPath: 'public/manifest.json',
        },
      ],
    });
    const plan = buildSystemInstallPlan(
      buildSystem(variant),
      variant,
      false,
      projectConfigPath,
    );

    expect(plan.directoryAssetDestinations).toEqual([
      'public/fonts/',
      'public/images/',
    ]);
    expect(plan.fileAssetDestinations).toEqual([
      'public/tokens.json',
      'public/manifest.json',
    ]);
    expect(plan.directoryAssetCount).toBe(3);
    expect(plan.fileAssetCount).toBe(3);
    expect(plan.totalAssetCount).toBe(6);
  });

  it('rejects a component destination outside the project', () => {
    const variant = buildVariant({
      structureImplementations: [{ name: 'base', directory: '../outside' }],
      components: [button],
    });

    expect(() =>
      buildSystemInstallPlan(
        buildSystem(variant),
        variant,
        false,
        projectConfigPath,
      ),
    ).toThrow('Component destination "../outside/button"');
  });

  it.each([
    {
      assetType: 'directory',
      unsafeDestination: '../outside',
      overrides: {
        directories: [
          {
            name: 'outside',
            path: 'assets/outside',
            destinationPath: '../outside',
          },
        ],
      },
    },
    {
      assetType: 'file',
      unsafeDestination: '../outside.json',
      overrides: {
        files: [
          {
            name: 'outside',
            path: 'assets/outside.json',
            destinationPath: '../outside.json',
          },
        ],
      },
    },
  ])(
    'rejects an unsafe $assetType asset destination',
    ({ overrides, unsafeDestination }) => {
      const variant = buildVariant({
        components: [],
        ...overrides,
      });

      expect(() =>
        buildSystemInstallPlan(
          buildSystem(variant),
          variant,
          false,
          projectConfigPath,
        ),
      ).toThrow(`General asset destination "${unsafeDestination}"`);
    },
  );

  it('rejects a component whose structure is not implemented by the variant', () => {
    const variant = buildVariant({
      structureImplementations: [],
      components: [button],
    });

    expect(() =>
      buildSystemInstallPlan(
        buildSystem(variant),
        variant,
        false,
        projectConfigPath,
      ),
    ).toThrow(
      'The structure (base) specified within the component button is invalid.',
    );
  });

  it('rejects a component whose structure is not declared by the system', () => {
    const variant = buildVariant({ components: [button] });

    expect(() =>
      buildSystemInstallPlan(
        buildSystem(variant, {
          structure: [{ name: 'layout', description: 'Layout components' }],
        }),
        variant,
        false,
        projectConfigPath,
      ),
    ).toThrow(
      'The structure (base) specified within the component button is invalid.',
    );
  });
});
