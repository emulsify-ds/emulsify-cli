import getGitRepoNameFromUrl from './getGitRepoNameFromUrl.js';
import fs from 'fs';
import { resolve } from 'path';
import { pathToFileURL } from 'url';

describe('getGitRepoNameFromUrl', () => {
  it('can convert an ssl git url into a repo name', () => {
    expect.assertions(1);
    expect(
      getGitRepoNameFromUrl('git@github.com:emulsify-ds/emulsify-cli.git'),
    ).toBe('emulsify-cli');
  });

  it('can convert an https git url into a repo name', () => {
    expect.assertions(1);
    expect(
      getGitRepoNameFromUrl(
        'https://github.com/emulsify-ds/emulsify-starter.git',
      ),
    ).toBe('emulsify-starter');
  });

  it('preserves dots in a remote repository name', () => {
    expect.assertions(1);

    expect(
      getGitRepoNameFromUrl(
        'https://github.com/emulsify-ds/example.system.git',
      ),
    ).toBe('example.system');
  });

  it('can derive a repository name from local paths without a .git suffix', () => {
    expect.assertions(4);

    expect(getGitRepoNameFromUrl('/tmp/example-system')).toBe('example-system');
    expect(getGitRepoNameFromUrl('./fixtures/example-system')).toBe(
      'example-system',
    );
    expect(getGitRepoNameFromUrl('C:\\fixtures\\example-system')).toBe(
      'example-system',
    );
    (fs.existsSync as jest.Mock).mockReturnValueOnce(true);
    expect(getGitRepoNameFromUrl('src')).toBe('src');
  });

  it('can derive a repository name from a local file url', () => {
    expect.assertions(1);

    expect(
      getGitRepoNameFromUrl(
        pathToFileURL(resolve('fixtures/example-system')).href,
      ),
    ).toBe('example-system');
  });

  it('strips a terminal .git suffix from local repository paths', () => {
    expect.assertions(2);

    expect(getGitRepoNameFromUrl('/tmp/example-system.git')).toBe(
      'example-system',
    );
    expect(getGitRepoNameFromUrl('/tmp/.git')).toBeUndefined();
  });

  it('returns nothing when a local file url cannot be parsed', () => {
    expect.assertions(1);

    expect(getGitRepoNameFromUrl('file://%')).toBeUndefined();
  });

  it('can throw an Error if given an invalid git url', () => {
    expect.assertions(5);
    expect(() => {
      getGitRepoNameFromUrl('');
    }).toThrow(Error);
    expect(() => {
      getGitRepoNameFromUrl('https://github.com/emulsify-ds/emulsify-starter');
    }).toThrow(Error);
    expect(() => {
      getGitRepoNameFromUrl(
        'ssh://git@github.com/emulsify-ds/emulsify-starter',
      );
    }).toThrow('The repository URL must end in .git.');
    expect(() => {
      getGitRepoNameFromUrl(
        'https://github.com/emulsify-ds/emulsify-starter.git?ref=main',
      );
    }).toThrow('The repository URL must end in .git.');
    expect(() => {
      getGitRepoNameFromUrl(
        'https://github.com/emulsify-ds/emulsify-starter.git#main',
      );
    }).toThrow('The repository URL must end in .git.');
  });
});
