import safeResolveWithin from './safeResolveWithin.js';

describe('safeResolveWithin', () => {
  const root = '/workspace/project';

  it('accepts normalized paths that remain inside the root', () => {
    expect(
      safeResolveWithin(
        root,
        './components/../components/00-base/button',
        'Component destination',
      ),
    ).toBe('/workspace/project/components/00-base/button');
  });

  it('accepts target path segments that remain inside the root', () => {
    expect(
      safeResolveWithin(
        root,
        ['components', '00-base', 'button'],
        'Component destination',
      ),
    ).toBe('/workspace/project/components/00-base/button');
  });

  it('rejects path traversal outside the root', () => {
    expect(() =>
      safeResolveWithin(root, '../../outside', 'Component destination'),
    ).toThrow(
      'Component destination "../../outside" resolves to "/outside", which is outside the expected root "/workspace/project".',
    );
  });

  it('rejects absolute paths outside the root', () => {
    expect(() =>
      safeResolveWithin(root, '/tmp/outside', 'Asset destination'),
    ).toThrow(
      'Asset destination "/tmp/outside" resolves to "/tmp/outside", which is outside the expected root "/workspace/project".',
    );
  });

  it('rejects the root itself by default', () => {
    expect(() => safeResolveWithin(root, '.', 'Asset destination')).toThrow(
      'Asset destination "." resolves to the expected root "/workspace/project", but a path inside the root is required.',
    );
  });

  it('allows the root itself only when explicitly requested', () => {
    expect(
      safeResolveWithin(root, '.', 'Project root', { allowRoot: true }),
    ).toBe('/workspace/project');
  });
});
