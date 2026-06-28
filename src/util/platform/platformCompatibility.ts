import type { Platform } from '@emulsify-cli/config';

const PLATFORMS = [
  'none',
  'drupal',
  'wordpress',
] as const satisfies readonly Platform[];

type VariantWithPlatform = {
  platform: string;
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
): number | undefined {
  const platforms = parsePlatformExpression(variantPlatform);
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

export function getVariantPlatformExpressions(
  variants: readonly VariantWithPlatform[] | undefined,
): string[] {
  return variants?.map(({ platform }) => platform) || [];
}

export function selectCompatiblePlatformVariant<T extends VariantWithPlatform>(
  variants: readonly T[] | undefined,
  projectPlatform: Platform,
): VariantSelectionResult<T> {
  const rankedVariants = (variants || [])
    .map((variant) => ({
      variant,
      rank: getVariantMatchRank(variant.platform, projectPlatform),
    }))
    .filter(
      (match): match is { variant: T; rank: number } =>
        match.rank !== undefined,
    );

  if (rankedVariants.length === 0) {
    return { status: 'none' };
  }

  const bestRank = Math.min(...rankedVariants.map(({ rank }) => rank));
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
  const matches = (variants || []).filter(
    ({ platform }) =>
      normalizePlatformExpression(platform) === normalizedPlatformExpression,
  );

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
