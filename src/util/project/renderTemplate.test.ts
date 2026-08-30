/**
 * @file Unit tests for component template token rendering.
 */

jest.mock('../../lib/log.js');

import log from '../../lib/log.js';
import renderTemplate, { renderLegacyTemplate } from './renderTemplate.js';
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

const twigVariableNames = Object.keys(vars) as Array<
  keyof ComponentTemplateVars
>;

describe('renderTemplate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all 12 canonical component template tokens', () => {
    expect.assertions(1);

    expect(
      renderTemplate(
        '__EMULSIFY_filename__|__EMULSIFY_className__|__EMULSIFY_camelName__|__EMULSIFY_pascalName__|__EMULSIFY_snakeName__|__EMULSIFY_humanName__|__EMULSIFY_directory__|__EMULSIFY_directoryTitle__|__EMULSIFY_format__|__EMULSIFY_formatLabel__|__EMULSIFY_type__|__EMULSIFY_tagName__',
        vars,
      ),
    ).toBe(
      'featured-item|featured-item|featuredItem|FeaturedItem|featured_item|Featured Item|base|Base|default|STANDARD|web-component|featured-item',
    );
  });

  it.each(twigVariableNames)(
    'leaves the ordinary Twig variable %s untouched without warning',
    (variableName) => {
      expect.assertions(2);
      const template = `{% if ${variableName} %}{{ ${variableName} }}{% endif %}`;

      expect(renderTemplate(template, vars)).toBe(template);
      expect(log).not.toHaveBeenCalled();
    },
  );

  it('does not rewrite the reported Twig type variable collision', () => {
    expect.assertions(2);
    const template =
      "{% if type == 'promo' %}<span>{{ type }}</span>{% endif %}";

    expect(renderTemplate(template, vars)).toBe(template);
    expect(log).not.toHaveBeenCalled();
  });

  it('does not rewrite the reported Twig directory and filename variable collisions', () => {
    expect.assertions(2);
    const template = '<a href="{{ directory }}/index.html">{{ filename }}</a>';

    expect(renderTemplate(template, vars)).toBe(template);
    expect(log).not.toHaveBeenCalled();
  });

  it('leaves an unknown canonical token untouched and logs one warning', () => {
    expect.assertions(3);
    const template = '__EMULSIFY_unknown__ __EMULSIFY_unknown__';

    expect(renderTemplate(template, vars)).toBe(template);
    expect(log).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenCalledWith(
      'warn',
      'Unknown component template token "__EMULSIFY_unknown__" left unchanged.',
    );
  });

  it.each(['human_name', 'constructor'])(
    'leaves the unknown canonical token %s untouched and warns',
    (token) => {
      expect.assertions(3);
      const template = `__EMULSIFY_${token}__`;

      expect(renderTemplate(template, vars)).toBe(template);
      expect(log).toHaveBeenCalledTimes(1);
      expect(log).toHaveBeenCalledWith(
        'warn',
        `Unknown component template token "${template}" left unchanged.`,
      );
    },
  );

  it('renders a canonical token nested inside a Twig print expression without consuming the outer braces', () => {
    expect.assertions(2);

    expect(
      renderTemplate('{{ __EMULSIFY_snakeName____base_class }}', vars),
    ).toBe('{{ featured_item__base_class }}');
    expect(log).not.toHaveBeenCalled();
  });
});

describe('renderLegacyTemplate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the seven component template tokens supported in v2.3', () => {
    expect.assertions(1);

    expect(
      renderLegacyTemplate(
        '{{ filename }}|{{ className }}|{{ camelName }}|{{ snakeName }}|{{ humanName }}|{{ directory }}|{{ format }}',
        vars,
      ),
    ).toBe(
      'featured-item|featured-item|featuredItem|featured_item|Featured Item|base|default',
    );
  });

  it('leaves a token introduced after v2.3 unknown in a legacy override', () => {
    expect.assertions(3);

    expect(renderLegacyTemplate('{{ type }} {{ type }}', vars)).toBe(
      '{{ type }} {{ type }}',
    );
    expect(log).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenCalledWith(
      'warn',
      'Unknown component template token "{{ type }}" left unchanged.',
    );
  });

  it('renders a legacy token nested inside a Twig print expression without consuming the outer braces', () => {
    expect.assertions(2);

    expect(
      renderLegacyTemplate('{{ {{ snakeName }}__base_class }}', vars),
    ).toBe('{{ featured_item__base_class }}');
    expect(log).not.toHaveBeenCalled();
  });
});
