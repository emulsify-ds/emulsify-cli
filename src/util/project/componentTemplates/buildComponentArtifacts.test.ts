import {
  COMPONENT_TYPES,
  getCompatibleFormatToken,
  getComponentFormatLabel,
  type ComponentType,
} from '../componentTypes.js';
import renderTemplate, {
  type ComponentTemplateVars,
} from '../renderTemplate.js';
import buildComponentArtifacts, {
  buildEjectableComponentTemplates,
} from './buildComponentArtifacts.js';

const EXPECTED_LOGICAL_NAMES: Record<ComponentType, string[]> = {
  twig: [
    'component.twig',
    'component.scss',
    'component.yml',
    'component.stories.js',
  ],
  'twig-sdc': [
    'component.twig',
    'component.scss',
    'component.component.yml',
    'component.js',
    'component.stories.js',
  ],
  react: ['component.jsx', 'component.scss', 'component.stories.jsx'],
  'web-component': ['component.js', 'component.scss', 'component.stories.js'],
};

function getConcreteVars(type: ComponentType): ComponentTemplateVars {
  return {
    filename: 'featured-item',
    className: 'featured-item',
    camelName: 'featuredItem',
    pascalName: 'FeaturedItem',
    snakeName: 'featured_item',
    humanName: 'Featured Item',
    directory: 'base',
    directoryTitle: 'Base',
    format: getCompatibleFormatToken(type),
    formatLabel: getComponentFormatLabel(type),
    type,
    tagName: type === 'web-component' ? 'featured-item' : '',
  };
}

describe('buildComponentArtifacts', () => {
  it('has exactly 15 built-in logical artifacts across the four types', () => {
    const artifacts = COMPONENT_TYPES.flatMap((type) =>
      buildEjectableComponentTemplates(type),
    );

    expect(artifacts).toHaveLength(15);
  });

  it.each(COMPONENT_TYPES)(
    'renders every ejected %s template byte-for-byte like its built-in',
    (type) => {
      const vars = getConcreteVars(type);
      const builtIns = buildComponentArtifacts(type, vars);
      const ejected = buildEjectableComponentTemplates(type);

      expect(ejected.map(({ logicalName }) => logicalName)).toEqual(
        EXPECTED_LOGICAL_NAMES[type],
      );
      expect(builtIns.map(({ logicalName }) => logicalName)).toEqual(
        EXPECTED_LOGICAL_NAMES[type],
      );

      for (const [index, ejectedArtifact] of ejected.entries()) {
        expect(renderTemplate(ejectedArtifact.contents, vars)).toBe(
          builtIns[index].contents,
        );
      }
    },
  );
});
