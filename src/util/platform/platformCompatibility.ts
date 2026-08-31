import type { Platform } from '@emulsify-cli/config';

const PLATFORMS = [
  'none',
  'drupal',
  'wordpress',
] as const satisfies readonly Platform[];

type VariantWithPlatform = {
  platform: string;
};

export type PlatformVariantMatchRank = 0 | 1 | 2 | 3;

export type RankedPlatformVariant<T extends VariantWithPlatform> = {
  variant: T;
  rank?: PlatformVariantMatchRank;
  index: number;
};

type RankedCompatiblePlatformVariant<T extends VariantWithPlatform> =
  RankedPlatformVariant<T> & {
    rank: PlatformVariantMatchRank;
  };

type VariantSelectionResult<T extends VariantWithPlatform> =
  | {
      status: 'selected';
      variant: T;
    }
  | {
      status: 'ambiguous';
      variants: T[];
    }
  | {
      status: 'none';
    };

export function isPlatform(value: string | void): value is Platform {
  return PLATFORMS.includes(value as Platform);
}

export function parsePlatformExpression(expression: string): Platform[] {
  const platforms = expression
    .split('||')
    .map((platform) => platform.trim())
    .filter((platform) => platform.length > 0);

  if (platforms.length === 0 || !platforms.every(isPlatform)) {
    throw new Error(`Invalid platform compatibility expression: ${expression}`);
  }

  return [...new Set(platforms)] as Platform[];
}

/**
 * Parse a platform expression without throwing for tokens this CLI does not
 * understand yet.
 *
 * @param expression platform compatibility expression to parse.
 * @returns parsed platforms, or undefined when the expression is invalid.
 */
export function tryParsePlatformExpression(
  expression: string,
): Platform[] | undefined {
  try {
    return parsePlatformExpression(expression);
  } catch {
    return undefined;
  }
}

export function normalizePlatformExpression(expression: string): string {
  return parsePlatformExpression(expression).join(' || ');
}

export function platformExpressionMatchesProject(
  expression: string,
  projectPlatform: Platform,
): boolean {
  const platforms = parsePlatformExpression(expression);

  if (projectPlatform === 'none') {
    return true;
  }

  return platforms.includes(projectPlatform) || platforms.includes('none');
}

function getVariantMatchRank(
  variantPlatform: string,
  projectPlatform: Platform,
): PlatformVariantMatchRank | undefined {
  const platforms = tryParsePlatformExpression(variantPlatform);
  if (!platforms) {
    return undefined;
  }

  const normalizedVariantPlatform = platforms.join(' || ');

  if (normalizedVariantPlatform === projectPlatform) {
    return 0;
  }

  if (projectPlatform === 'none') {
    return 3;
  }

  if (platforms.includes(projectPlatform)) {
    return 1;
  }

  if (platforms.includes('none')) {
    return 2;
  }

  return undefined;
}

/**
 * Return every variant with compatible variants ordered from the strongest
 * platform match to the weakest, followed by incompatible variants. Variants
 * with the same rank retain their source order.
 *
 * The returned records and array are new; variants and the source array are
 * never mutated.
 */
export function rankPlatformVariants<T extends VariantWithPlatform>(
  variants: readonly T[] | undefined,
  projectPlatform: Platform,
): RankedPlatformVariant<T>[] {
  return (variants || [])
    .map((variant, index) => {
      const rank = getVariantMatchRank(variant.platform, projectPlatform);
      return rank === undefined ? { variant, index } : { variant, rank, index };
    })
    .sort((left, right) => {
      if (left.rank === undefined) {
        return right.rank === undefined ? left.index - right.index : 1;
      }
      if (right.rank === undefined) {
        return -1;
      }
      return left.rank - right.rank || left.index - right.index;
    });
}

export function getVariantPlatformExpressions(
  variants: readonly VariantWithPlatform[] | undefined,
): string[] {
  return variants?.map(({ platform }) => platform) || [];
}

export function selectCompatiblePlatformVariant<T extends VariantWithPlatform>(
  variants: readonly T[] | undefined,
  projectPlatform: Platform,
): VariantSelectionResult<T> {
  const rankedVariants = rankPlatformVariants(variants, projectPlatform).filter(
    (match): match is RankedCompatiblePlatformVariant<T> =>
      match.rank !== undefined,
  );

  if (rankedVariants.length === 0) {
    return { status: 'none' };
  }

  const bestRank = rankedVariants[0].rank;
  const bestMatches = rankedVariants
    .filter(({ rank }) => rank === bestRank)
    .map(({ variant }) => variant);

  if (bestMatches.length === 1) {
    return {
      status: 'selected',
      variant: bestMatches[0],
    };
  }

  return {
    status: 'ambiguous',
    variants: bestMatches,
  };
}

export function selectExactPlatformVariant<T extends VariantWithPlatform>(
  variants: readonly T[] | undefined,
  platformExpression: string,
): VariantSelectionResult<T> {
  const normalizedPlatformExpression =
    normalizePlatformExpression(platformExpression);
  const matches = (variants || []).filter(({ platform }) => {
    const platforms = tryParsePlatformExpression(platform);
    return platforms?.join(' || ') === normalizedPlatformExpression;
  });

  if (matches.length === 0) {
    return { status: 'none' };
  }

  if (matches.length === 1) {
    return {
      status: 'selected',
      variant: matches[0],
    };
  }

  return {
    status: 'ambiguous',
    variants: matches,
  };
}
