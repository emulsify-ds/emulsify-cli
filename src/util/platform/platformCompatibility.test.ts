import {
  getVariantPlatformExpressions,
  isPlatform,
  normalizePlatformExpression,
  parsePlatformExpression,
  platformExpressionMatchesProject,
  rankPlatformVariants,
  selectCompatiblePlatformVariant,
  selectExactPlatformVariant,
  tryParsePlatformExpression,
} from './platformCompatibility.js';

const drupalVariant = { platform: 'drupal', name: 'drupal' };
const wordpressVariant = { platform: 'wordpress', name: 'wordpress' };
const sharedVariant = { platform: 'drupal || wordpress', name: 'shared' };
const genericVariant = { platform: 'none', name: 'generic' };
const unknownVariant = { platform: 'eleventy', name: 'future' };

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

  describe('tryParsePlatformExpression', () => {
    it('returns parsed platforms for valid expressions', () => {
      expect(tryParsePlatformExpression('drupal || wordpress')).toEqual([
        'drupal',
        'wordpress',
      ]);
    });

    it('returns undefined for invalid expressions', () => {
      expect(tryParsePlatformExpression('eleventy')).toBeUndefined();
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

  describe('rankPlatformVariants', () => {
    it('orders exact, shared, and generic matches before incompatible variants', () => {
      const variants = [
        genericVariant,
        wordpressVariant,
        sharedVariant,
        drupalVariant,
        unknownVariant,
      ];

      expect(rankPlatformVariants(variants, 'drupal')).toEqual([
        {
          variant: drupalVariant,
          rank: 0,
          index: 3,
        },
        {
          variant: sharedVariant,
          rank: 1,
          index: 2,
        },
        {
          variant: genericVariant,
          rank: 2,
          index: 0,
        },
        {
          variant: wordpressVariant,
          index: 1,
        },
        {
          variant: unknownVariant,
          index: 4,
        },
      ]);
    });

    it('prefers an exact generic variant for none projects and ranks all other variants equally', () => {
      const variants = [drupalVariant, genericVariant, wordpressVariant];

      expect(rankPlatformVariants(variants, 'none')).toEqual([
        {
          variant: genericVariant,
          rank: 0,
          index: 1,
        },
        {
          variant: drupalVariant,
          rank: 3,
          index: 0,
        },
        {
          variant: wordpressVariant,
          rank: 3,
          index: 2,
        },
      ]);
    });

    it('preserves source order when compatible variants have the same rank', () => {
      const firstSharedVariant = {
        platform: 'drupal || wordpress',
        name: 'first',
      };
      const secondSharedVariant = {
        platform: 'wordpress || drupal',
        name: 'second',
      };

      expect(
        rankPlatformVariants(
          [secondSharedVariant, firstSharedVariant],
          'wordpress',
        ),
      ).toEqual([
        {
          variant: secondSharedVariant,
          rank: 1,
          index: 0,
        },
        {
          variant: firstSharedVariant,
          rank: 1,
          index: 1,
        },
      ]);
    });

    it('does not mutate the source array or variants', () => {
      const exactVariant = Object.freeze({
        platform: 'drupal',
        name: 'exact',
      });
      const generic = Object.freeze({
        platform: 'none',
        name: 'generic',
      });
      const variants = Object.freeze([generic, exactVariant]);

      const ranked = rankPlatformVariants(variants, 'drupal');

      expect(variants).toEqual([generic, exactVariant]);
      expect(ranked).not.toBe(variants);
      expect(ranked.map(({ variant }) => variant)).toEqual([
        exactVariant,
        generic,
      ]);
      expect(ranked[0].variant).toBe(exactVariant);
      expect(ranked[1].variant).toBe(generic);
    });

    it('retains unranked variants and handles a missing variant list', () => {
      expect(rankPlatformVariants([wordpressVariant], 'drupal')).toEqual([
        {
          variant: wordpressVariant,
          index: 0,
        },
      ]);
      expect(rankPlatformVariants(undefined, 'drupal')).toEqual([]);
    });
  });

  describe('selectCompatiblePlatformVariant', () => {
    it('skips unparseable variants when a compatible variant exists', () => {
      expect(
        selectCompatiblePlatformVariant(
          [unknownVariant, drupalVariant],
          'drupal',
        ),
      ).toEqual({
        status: 'selected',
        variant: drupalVariant,
      });
    });

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
    it('skips unparseable variants when an exact variant exists', () => {
      expect(
        selectExactPlatformVariant([unknownVariant, drupalVariant], 'drupal'),
      ).toEqual({
        status: 'selected',
        variant: drupalVariant,
      });
    });

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
