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
  snakeName: 'featured_item',
  humanName: 'Featured Item',
  directory: 'base',
  format: 'default',
};

describe('renderTemplate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all supported component template tokens', () => {
    expect.assertions(1);

    expect(
      renderTemplate(
        '{{ filename }}|{{ className }}|{{ camelName }}|{{ snakeName }}|{{ humanName }}|{{ directory }}|{{ format }}',
        vars,
      ),
    ).toBe(
      'featured-item|featured-item|featuredItem|featured_item|Featured Item|base|default',
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
