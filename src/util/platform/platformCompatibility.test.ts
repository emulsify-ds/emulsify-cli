import {
  getVariantPlatformExpressions,
  isPlatform,
  normalizePlatformExpression,
  parsePlatformExpression,
  platformExpressionMatchesProject,
  selectCompatiblePlatformVariant,
  selectExactPlatformVariant,
} from './platformCompatibility.js';

const drupalVariant = { platform: 'drupal', name: 'drupal' };
const wordpressVariant = { platform: 'wordpress', name: 'wordpress' };
const sharedVariant = { platform: 'drupal || wordpress', name: 'shared' };
const genericVariant = { platform: 'none', name: 'generic' };

describe('platformCompatibility', () => {
  describe('isPlatform', () => {
    it('validates known platform values', () => {
      expect(isPlatform('drupal')).toBe(true);
      expect(isPlatform('wordpress')).toBe(true);
      expect(isPlatform('none')).toBe(true);
      expect(isPlatform('java')).toBe(false);
      expect(isPlatform(undefined)).toBe(false);
    });
  });

  describe('parsePlatformExpression', () => {
    it('parses and trims compatibility expressions', () => {
      expect(parsePlatformExpression(' drupal || wordpress ')).toEqual([
        'drupal',
        'wordpress',
      ]);
    });

    it('deduplicates platform expressions', () => {
      expect(parsePlatformExpression('drupal || drupal')).toEqual(['drupal']);
    });

    it('rejects empty expressions', () => {
      expect(() => parsePlatformExpression(' || ')).toThrow(
        'Invalid platform compatibility expression:  || ',
      );
    });

    it('rejects unknown platform values', () => {
      expect(() => parsePlatformExpression('drupal || java')).toThrow(
        'Invalid platform compatibility expression: drupal || java',
      );
    });
  });

  it('normalizes platform expression whitespace', () => {
    expect(normalizePlatformExpression('drupal|| wordpress')).toBe(
      'drupal || wordpress',
    );
  });

  describe('platformExpressionMatchesProject', () => {
    it('matches concrete and generic expressions for concrete projects', () => {
      expect(platformExpressionMatchesProject('wordpress', 'wordpress')).toBe(
        true,
      );
      expect(
        platformExpressionMatchesProject('drupal || wordpress', 'wordpress'),
      ).toBe(true);
      expect(platformExpressionMatchesProject('none', 'wordpress')).toBe(true);
      expect(platformExpressionMatchesProject('drupal', 'wordpress')).toBe(
        false,
      );
    });

    it('allows none projects to match any expression', () => {
      expect(platformExpressionMatchesProject('drupal', 'none')).toBe(true);
      expect(platformExpressionMatchesProject('wordpress', 'none')).toBe(true);
    });
  });

  describe('getVariantPlatformExpressions', () => {
    it('returns variant platform strings', () => {
      expect(
        getVariantPlatformExpressions([drupalVariant, sharedVariant]),
      ).toEqual(['drupal', 'drupal || wordpress']);
    });

    it('returns an empty list when variants are missing', () => {
      expect(getVariantPlatformExpressions(undefined)).toEqual([]);
    });
  });

  describe('selectCompatiblePlatformVariant', () => {
    it('prefers exact matches over shared and generic variants', () => {
      expect(
        selectCompatiblePlatformVariant(
          [genericVariant, sharedVariant, wordpressVariant],
          'wordpress',
        ),
      ).toEqual({
        status: 'selected',
        variant: wordpressVariant,
      });
    });

    it('prefers shared expressions over generic variants', () => {
      expect(
        selectCompatiblePlatformVariant(
          [genericVariant, sharedVariant],
          'wordpress',
        ),
      ).toEqual({
        status: 'selected',
        variant: sharedVariant,
      });
    });

    it('selects generic variants for concrete projects', () => {
      expect(
        selectCompatiblePlatformVariant([genericVariant], 'wordpress'),
      ).toEqual({
        status: 'selected',
        variant: genericVariant,
      });
    });

    it('selects any single variant for none projects', () => {
      expect(selectCompatiblePlatformVariant([drupalVariant], 'none')).toEqual({
        status: 'selected',
        variant: drupalVariant,
      });
    });

    it('reports ambiguity when multiple variants share the best rank', () => {
      expect(
        selectCompatiblePlatformVariant(
          [
            { platform: 'drupal || wordpress', name: 'shared-a' },
            { platform: 'wordpress || drupal', name: 'shared-b' },
          ],
          'wordpress',
        ),
      ).toEqual({
        status: 'ambiguous',
        variants: [
          { platform: 'drupal || wordpress', name: 'shared-a' },
          { platform: 'wordpress || drupal', name: 'shared-b' },
        ],
      });
    });

    it('reports ambiguity when none projects match multiple variants', () => {
      expect(
        selectCompatiblePlatformVariant(
          [drupalVariant, wordpressVariant],
          'none',
        ),
      ).toEqual({
        status: 'ambiguous',
        variants: [drupalVariant, wordpressVariant],
      });
    });

    it('returns none when no variant is compatible', () => {
      expect(
        selectCompatiblePlatformVariant([drupalVariant], 'wordpress'),
      ).toEqual({
        status: 'none',
      });
      expect(selectCompatiblePlatformVariant(undefined, 'wordpress')).toEqual({
        status: 'none',
      });
    });
  });

  describe('selectExactPlatformVariant', () => {
    it('selects exact normalized platform expressions', () => {
      expect(
        selectExactPlatformVariant(
          [{ platform: 'drupal || wordpress', name: 'shared' }],
          'drupal||wordpress',
        ),
      ).toEqual({
        status: 'selected',
        variant: { platform: 'drupal || wordpress', name: 'shared' },
      });
    });

    it('reports ambiguity for duplicated exact expressions', () => {
      expect(
        selectExactPlatformVariant(
          [
            { platform: 'wordpress', name: 'one' },
            { platform: 'wordpress', name: 'two' },
          ],
          'wordpress',
        ),
      ).toEqual({
        status: 'ambiguous',
        variants: [
          { platform: 'wordpress', name: 'one' },
          { platform: 'wordpress', name: 'two' },
        ],
      });
    });

    it('returns none when no exact variant exists', () => {
      expect(selectExactPlatformVariant([drupalVariant], 'wordpress')).toEqual({
        status: 'none',
      });
      expect(selectExactPlatformVariant(undefined, 'wordpress')).toEqual({
        status: 'none',
      });
    });
  });
});
