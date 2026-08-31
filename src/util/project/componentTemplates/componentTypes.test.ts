import {
  buildReactStoriesTemplate,
  buildReactTemplate,
  buildScssTemplate,
  buildSdcStoriesTemplate,
  buildStoriesTemplate,
  buildTwigTemplate,
  buildWebComponentStoriesTemplate,
  buildWebComponentTemplate,
} from './index.js';

describe('derived display values', () => {
  it('uses the supplied format label without transforming it', () => {
    expect.assertions(2);

    expect(
      buildTwigTemplate(
        'featured-item',
        'featured_item',
        'featured-item',
        'DEFAULT',
      ),
    ).toContain('* Format: DEFAULT');
    expect(buildScssTemplate('featured-item', 'DEFAULT')).toContain(
      '(DEFAULT)',
    );
  });

  it('uses the supplied Storybook directory title without transforming it', () => {
    expect.assertions(4);

    expect(
      buildStoriesTemplate(
        'featuredItem',
        'featured-item',
        'Featured Item',
        'components',
      ),
    ).toContain("title: 'components/Featured Item'");
    expect(
      buildSdcStoriesTemplate(
        'featuredItem',
        'featured-item',
        'featured_item',
        'Featured Item',
        'components',
      ),
    ).toContain("title: 'components/Featured Item'");
    expect(
      buildReactStoriesTemplate(
        'FeaturedItem',
        'featured-item',
        'Featured Item',
        'components',
      ),
    ).toContain("title: 'components/Featured Item'");
    expect(
      buildWebComponentStoriesTemplate(
        'featured-item',
        'Featured Item',
        'components',
        'featured-item',
      ),
    ).toContain("title: 'components/Featured Item'");
  });
});

describe('React component templates', () => {
  it('builds a named JSX component with the shared component class names', () => {
    expect.assertions(6);

    const template = buildReactTemplate(
      'FeaturedItem',
      'featured-item',
      'featured-item',
      'Featured Item',
    );

    expect(template).toContain('* featured-item.jsx');
    expect(template).toContain("import React from 'react';");
    expect(template).toContain('export function FeaturedItem({');
    expect(template).toContain('className="featured-item"');
    expect(template).toContain('className="featured-item__heading"');
    expect(template).toContain('className="featured-item__content"');
  });

  it('builds a standard React CSF story', () => {
    expect.assertions(5);

    const template = buildReactStoriesTemplate(
      'FeaturedItem',
      'featured-item',
      'Featured Item',
      'Components',
    );

    expect(template).toContain(
      "import { FeaturedItem } from './featured-item.jsx';",
    );
    expect(template).toContain("title: 'Components/Featured Item'");
    expect(template).toContain('component: FeaturedItem');
    expect(template).toContain("heading: 'Featured Item Component'");
    expect(template).toContain('export const Default = {};');
  });
});

describe('web component templates', () => {
  it('builds an HTMLElement subclass with guarded native registration', () => {
    expect.assertions(8);

    const template = buildWebComponentTemplate(
      'FeaturedItem',
      'featured-item',
      'featured-item',
      'Featured Item',
      'featured-item',
    );

    expect(template).toContain('* featured-item.js');
    expect(template).toContain(
      'export class FeaturedItemElement extends HTMLElement',
    );
    expect(template).toContain('set heading(value)');
    expect(template).toContain('set content(value)');
    expect(template).toContain('connectedCallback()');
    expect(template).toContain('class="featured-item"');
    expect(template).toContain("if (!customElements.get('featured-item'))");
    expect(template).toContain(
      "customElements.define('featured-item', FeaturedItemElement);",
    );
  });

  it('builds a story with the public Emulsify Core renderer', () => {
    expect.assertions(6);

    const template = buildWebComponentStoriesTemplate(
      'featured-item',
      'Featured Item',
      'Components',
      'featured-item',
    );

    expect(template).toContain(
      "import { renderWebComponent } from '@emulsify/core/storybook';",
    );
    expect(template).toContain("import './featured-item.js';");
    expect(template).toContain("title: 'Components/Featured Item'");
    expect(template).toContain("render: renderWebComponent('featured-item')");
    expect(template).toContain("heading: 'Featured Item Component'");
    expect(template).toContain('export const Default = {};');
  });
});
