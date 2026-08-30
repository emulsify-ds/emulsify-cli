import { join } from 'path';

import type { Platform } from '@emulsify-cli/config';

import loadJsonFile from '../fs/loadJsonFile.js';

export const COMPONENT_TYPES = [
  'twig',
  'twig-sdc',
  'react',
  'web-component',
] as const;

export type ComponentType = (typeof COMPONENT_TYPES)[number];

export const MISSING_COMPONENT_TYPE_ERROR =
  'Component type is required in non-interactive mode. Pass --type <twig|twig-sdc|react|web-component>.';
export const MISSING_COMPONENT_DIRECTORY_ERROR =
  'Component directory is required in non-interactive mode. Pass --directory <directory>.';

const LEGACY_FORMAT_TO_TYPE = {
  default: 'twig',
  sdc: 'twig-sdc',
} as const satisfies Record<string, ComponentType>;

type LegacyComponentFormat = keyof typeof LEGACY_FORMAT_TO_TYPE;

type ProjectPackage = {
  dependencies?: Record<string, unknown>;
  devDependencies?: Record<string, unknown>;
};

function normalizeOption(value: string): string {
  return value.trim().toLowerCase();
}

/** Validate and normalize a canonical component type option. */
export function normalizeComponentType(value: string): ComponentType {
  const normalized = normalizeOption(value);
  if (!COMPONENT_TYPES.includes(normalized as ComponentType)) {
    throw new Error(
      `Invalid component type "${value}". Supported types are: ${COMPONENT_TYPES.join(', ')}.`,
    );
  }

  return normalized as ComponentType;
}

/** Map a deprecated component format option onto its canonical type. */
export function componentTypeFromLegacyFormat(value: string): ComponentType {
  const normalized = normalizeOption(value);
  if (!(normalized in LEGACY_FORMAT_TO_TYPE)) {
    throw new Error(
      `Invalid component format "${value}". Supported formats are: default, sdc.`,
    );
  }

  return LEGACY_FORMAT_TO_TYPE[normalized as LegacyComponentFormat];
}

/** Preserve the legacy format token for existing Twig template overrides. */
export function getCompatibleFormatToken(type: ComponentType): string {
  if (type === 'twig') return 'default';
  if (type === 'twig-sdc') return 'sdc';
  return type;
}

/** Return the types the interactive wizard can safely recommend. */
export function getAvailableComponentTypes(
  platform: Platform,
  hasEmulsifyCore: boolean,
): ComponentType[] {
  return COMPONENT_TYPES.filter((type) => {
    if (type === 'twig-sdc') return platform === 'drupal';
    if (type === 'react' || type === 'web-component') {
      return hasEmulsifyCore;
    }
    return true;
  });
}

function hasDependency(
  dependencies: Record<string, unknown> | undefined,
): boolean {
  const version = dependencies?.['@emulsify/core'];
  return typeof version === 'string' && version.trim().length > 0;
}

/**
 * Heuristically detect whether a project declares Emulsify Core.
 *
 * Missing or unreadable package metadata means "not detected" rather than a
 * scaffolding failure; explicit component types are still honored by callers.
 */
export async function projectDeclaresEmulsifyCore(
  projectRoot: string,
): Promise<boolean> {
  try {
    const packageInfo = await loadJsonFile<ProjectPackage>(
      join(projectRoot, 'package.json'),
    );
    return (
      hasDependency(packageInfo?.dependencies) ||
      hasDependency(packageInfo?.devDependencies)
    );
  } catch {
    return false;
  }
}
