import { isAbsolute, relative, resolve } from 'path';

type SafeResolveWithinOptions = {
  allowRoot?: boolean;
};

function formatTarget(target: string | string[]): string {
  return Array.isArray(target) ? target.join('/') : target;
}

/**
 * Resolve a target path and ensure it stays within an expected root.
 *
 * @param rootPath absolute or relative root directory path.
 * @param target path string or path segments to resolve from the root.
 * @param label user-facing label for error messages.
 * @param options.allowRoot whether the target may resolve exactly to the root.
 * @returns absolute resolved target path.
 */
export default function safeResolveWithin(
  rootPath: string,
  target: string | string[],
  label: string,
  { allowRoot = false }: SafeResolveWithinOptions = {},
): string {
  const root = resolve(rootPath);
  const resolvedTarget = Array.isArray(target)
    ? resolve(root, ...target)
    : resolve(root, target);
  const targetLabel = formatTarget(target);
  const relativePath = relative(root, resolvedTarget);

  if (relativePath === '') {
    if (allowRoot) {
      return resolvedTarget;
    }

    throw new Error(
      `${label} "${targetLabel}" resolves to the expected root "${root}", but a path inside the root is required.`,
    );
  }

  if (relativePath.startsWith('..') || isAbsolute(relativePath)) {
    throw new Error(
      `${label} "${targetLabel}" resolves to "${resolvedTarget}", which is outside the expected root "${root}".`,
    );
  }

  return resolvedTarget;
}
