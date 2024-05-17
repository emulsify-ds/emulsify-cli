import type { Components } from '@emulsify-cli/config';
import buildComponentDependencyList from './buildComponentDependencyList';

describe('buildComponentDependencyList', () => {
  const components = [
    {
      name: 'buttons',
      structure: 'base',
      dependency: [],
    },
    {
      name: 'images',
      structure: 'base',
      dependency: [],
    },
    {
      name: 'links',
      structure: 'base',
      dependency: [],
    },
    {
      name: 'text',
      structure: 'base',
      dependency: ['links'],
    },
    {
      name: 'card',
      structure: 'base',
      dependency: ['images', 'text', 'links', 'buttons'],
    },
    {
      name: 'menus',
      structure: 'molecules',
      dependency: ['images', 'text'],
    },
  ] as Components;

  it('Build list of components without dependency', () => {
    expect(buildComponentDependencyList(components, ['buttons'])).toEqual([
      'buttons',
    ]);
  });

  it('Build all components dependency for not existing component', () => {
    expect(buildComponentDependencyList(components, ['test'])).toEqual([]);
  });

  it('Build all components dependency tree returning flat list without duplicates', () => {
    expect(buildComponentDependencyList(components, ['card'])).toEqual([
      'card',
      'images',
      'text',
      'links',
      'buttons',
    ]);
  });

  it('Build all components dependency tree with hierarchical dependency', () => {
    expect(buildComponentDependencyList(components, ['menus'])).toEqual([
      'menus',
      'images',
      'text',
      'links',
    ]);
  });

  it('Build all components dependency tree for 2 components', () => {
    expect(buildComponentDependencyList(components, ['menus', 'card'])).toEqual(
      ['menus', 'card', 'images', 'text', 'links', 'buttons']
    );
  });
});
