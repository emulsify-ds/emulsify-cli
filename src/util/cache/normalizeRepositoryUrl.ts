import { isAbsolute, resolve, win32 } from 'path';

/**
 * Normalize repository URLs before using them as cache identity inputs.
 *
 * Trimming whitespace and trailing slashes keeps equivalent configured and
 * on-disk remote values from producing separate cache entries. Git records
 * relative local clone origins as absolute paths, so local paths are resolved
 * before they are hashed, cloned, or compared.
 */
export default function normalizeRepositoryUrl(repository: string): string {
  const normalizedRepository = repository.trim().replace(/\/+$/, '');
  if (!normalizedRepository) {
    return '';
  }

  const isUri = /^[a-z][a-z\d+.-]*:\/\//i.test(normalizedRepository);
  const isScpLike = /^(?:[^@/\\\s]+@)?[^:/\\\s]+:.+/.test(normalizedRepository);
  if (
    isUri ||
    isScpLike ||
    isAbsolute(normalizedRepository) ||
    win32.isAbsolute(normalizedRepository)
  ) {
    return normalizedRepository;
  }

  return resolve(normalizedRepository);
}
