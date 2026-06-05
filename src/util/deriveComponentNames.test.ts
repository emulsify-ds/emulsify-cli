/**
 * @file Unit tests for component name derivation.
 */

import deriveComponentNames from './deriveComponentNames.js';

describe('deriveComponentNames', () => {
  it('derives all component name forms from multi-word camelCase input', () => {
    expect.assertions(1);

    expect(deriveComponentNames('featuredItem')).toEqual({
      filename: 'featured-item',
      className: 'featured-item',
      camelName: 'featuredItem',
      snakeName: 'featured_item',
      humanName: 'Featured Item',
    });
  });

  it('preserves kebab-case input as the generated filename and class name', () => {
    expect.assertions(1);

    expect(deriveComponentNames('featured-item')).toEqual({
      filename: 'featured-item',
      className: 'featured-item',
      camelName: 'featuredItem',
      snakeName: 'featured_item',
      humanName: 'Featured Item',
    });
  });

  it('trims surrounding whitespace before deriving names', () => {
    expect.assertions(1);

    expect(deriveComponentNames('  featuredItem  ')).toEqual({
      filename: 'featured-item',
      className: 'featured-item',
      camelName: 'featuredItem',
      snakeName: 'featured_item',
      humanName: 'Featured Item',
    });
  });

  it('throws when the component name is empty after trimming', () => {
    expect.assertions(1);

    expect(() => deriveComponentNames('   ')).toThrow(
      'Component name must include at least one letter or number.',
    );
  });

  it('throws when the component name contains invalid characters', () => {
    expect.assertions(2);

    expect(() => deriveComponentNames('featured item')).toThrow(
      'Component name may only include letters, numbers, and single hyphens between words.',
    );
    expect(() => deriveComponentNames('featured_item')).toThrow(
      'Component name may only include letters, numbers, and single hyphens between words.',
    );
  });
});
