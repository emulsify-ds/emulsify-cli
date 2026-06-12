import type { Components } from '@emulsify-cli/config';
import buildComponentDependencyList from './buildComponentDependencyList.js';

describe('buildComponentDependencyList', () => {
  const components = [
    {
      name: 'button',
      structure: 'base',
      dependency: ['icon'],
    },
    {
      name: 'icon',
      structure: 'base',
    },
    {
      name: 'card',
      structure: 'base',
      dependency: ['teaser'],
    },
    {
      name: 'teaser',
      structure: 'base',
      dependency: ['image'],
    },
    {
      name: 'image',
      structure: 'base',
    },
    {
      name: 'gallery',
      structure: 'molecules',
      dependency: ['teaser', 'image'],
    },
  ] as Components;

  it('returns the root component followed by direct dependencies', () => {
    expect(buildComponentDependencyList(components, 'button')).toEqual([
      'button',
      'icon',
    ]);
  });

  it('returns an empty dependency list for a missing root component', () => {
    expect(buildComponentDependencyList(components, 'test')).toEqual([]);
  });

  it('returns nested dependencies in deterministic preorder', () => {
    expect(buildComponentDependencyList(components, 'card')).toEqual([
      'card',
      'teaser',
      'image',
    ]);
  });

  it('returns duplicate nested dependencies only once', () => {
    expect(buildComponentDependencyList(components, 'gallery')).toEqual([
      'gallery',
      'teaser',
      'image',
    ]);
  });

  it('throws a clear error when a dependency is missing', () => {
    expect(() =>
      buildComponentDependencyList(
        [
          {
            name: 'button',
            structure: 'base',
            dependency: ['missing'],
          },
        ] as Components,
        'button',
      ),
    ).toThrow(
      'Cannot resolve component dependency "missing" referenced by "button" while resolving "button". Dependency path: button -> missing.',
    );
  });

  it('throws a clear error when dependencies are circular', () => {
    expect(() =>
      buildComponentDependencyList(
        [
          {
            name: 'a',
            structure: 'base',
            dependency: ['b'],
          },
          {
            name: 'b',
            structure: 'base',
            dependency: ['a'],
          },
        ] as Components,
        'a',
      ),
    ).toThrow(
      'Circular component dependency detected while resolving "a": a -> b -> a.',
    );
  });
});
