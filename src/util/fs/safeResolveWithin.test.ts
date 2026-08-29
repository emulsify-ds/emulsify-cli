import { resolve } from 'path';
import safeResolveWithin from './safeResolveWithin.js';

describe('safeResolveWithin', () => {
  const root = resolve('workspace', 'project');
  const buttonDestination = resolve(root, 'components', '00-base', 'button');

  it('accepts normalized paths that remain inside the root', () => {
    const target = './components/../components/00-base/button';
    expect(safeResolveWithin(root, target, 'Component destination')).toBe(
      buttonDestination,
    );
  });

  it('accepts target path segments that remain inside the root', () => {
    expect(
      safeResolveWithin(
        root,
        ['components', '00-base', 'button'],
        'Component destination',
      ),
    ).toBe(buttonDestination);
  });

  it('rejects path traversal outside the root', () => {
    const target = '../../outside';
    const outsideRoot = resolve(root, target);
    expect(() =>
      safeResolveWithin(root, target, 'Component destination'),
    ).toThrow(
      `Component destination "${target}" resolves to "${outsideRoot}", which is outside the expected root "${root}".`,
    );
  });

  it('rejects absolute paths outside the root', () => {
    const outsideRoot = resolve(root, '..', '..', 'tmp', 'outside');
    expect(() =>
      safeResolveWithin(root, outsideRoot, 'Asset destination'),
    ).toThrow(
      `Asset destination "${outsideRoot}" resolves to "${outsideRoot}", which is outside the expected root "${root}".`,
    );
  });

  it('rejects the root itself by default', () => {
    expect(() => safeResolveWithin(root, '.', 'Asset destination')).toThrow(
      `Asset destination "." resolves to the expected root "${root}", but a path inside the root is required.`,
    );
  });

  it('allows the root itself only when explicitly requested', () => {
    expect(
      safeResolveWithin(root, '.', 'Project root', { allowRoot: true }),
    ).toBe(root);
  });
});
