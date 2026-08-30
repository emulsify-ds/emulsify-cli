/**
 * @file Unit tests for component template token rendering.
 */

jest.mock('../../lib/log.js');

import log from '../../lib/log.js';
import renderTemplate from './renderTemplate.js';
import type { ComponentTemplateVars } from './renderTemplate.js';

const vars: ComponentTemplateVars = {
  filename: 'featured-item',
  className: 'featured-item',
  camelName: 'featuredItem',
  pascalName: 'FeaturedItem',
  snakeName: 'featured_item',
  humanName: 'Featured Item',
  directory: 'base',
  directoryTitle: 'Base',
  format: 'default',
  formatLabel: 'STANDARD',
  type: 'web-component',
  tagName: 'featured-item',
};

describe('renderTemplate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all supported component template tokens', () => {
    expect.assertions(1);

    expect(
      renderTemplate(
        '{{ filename }}|{{ className }}|{{ camelName }}|{{ pascalName }}|{{ snakeName }}|{{ humanName }}|{{ directory }}|{{ directoryTitle }}|{{ format }}|{{ formatLabel }}|{{ type }}|{{ tagName }}',
        vars,
      ),
    ).toBe(
      'featured-item|featured-item|featuredItem|FeaturedItem|featured_item|Featured Item|base|Base|default|STANDARD|web-component|featured-item',
    );
  });

  it('leaves unknown tokens untouched and logs one warning per token', () => {
    expect.assertions(3);

    expect(
      renderTemplate('{{ humanName }} {{ unknown }} {{ unknown }}', vars),
    ).toBe('Featured Item {{ unknown }} {{ unknown }}');
    expect(log).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenCalledWith(
      'warn',
      'Unknown component template token "{{ unknown }}" left unchanged.',
    );
  });
});
