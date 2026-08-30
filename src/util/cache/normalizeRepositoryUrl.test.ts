import { resolve } from 'path';
import normalizeRepositoryUrl from './normalizeRepositoryUrl.js';

describe('normalizeRepositoryUrl', () => {
  it('trims repository URLs and removes trailing slashes', () => {
    expect(
      normalizeRepositoryUrl('  https://example.com/project.git///  '),
    ).toBe('https://example.com/project.git');
  });

  it('preserves SCP-style repository URLs', () => {
    expect(normalizeRepositoryUrl('git@example.com:org/project.git/')).toBe(
      'git@example.com:org/project.git',
    );
  });

  it('resolves relative local repository paths', () => {
    expect(normalizeRepositoryUrl('./fixtures/project.git/')).toBe(
      resolve('./fixtures/project.git'),
    );
  });

  it('preserves absolute POSIX and Windows repository paths', () => {
    expect(normalizeRepositoryUrl('/tmp/project.git/')).toBe(
      '/tmp/project.git',
    );
    expect(normalizeRepositoryUrl('\\\\server\\share\\project.git')).toBe(
      '\\\\server\\share\\project.git',
    );
  });

  it('preserves an empty repository fallback', () => {
    expect(normalizeRepositoryUrl('   ')).toBe('');
  });
});
