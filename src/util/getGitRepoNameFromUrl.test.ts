import getGitRepoNameFromUrl from './getGitRepoNameFromUrl';

describe('getGitRepoNameFromUrl', () => {
  it('can convert an ssl git url into a repo name', () => {
    expect.assertions(1);
    expect(
      getGitRepoNameFromUrl('git@github.com:emulsify-ds/emulsify-cli.git')
    ).toBe('emulsify-cli');
  });

  it('can convert an https git url into a repo name', () => {
    expect.assertions(1);
    expect(
      getGitRepoNameFromUrl(
        'https://github.com/emulsify-ds/emulsify-drupal.git'
      )
    ).toBe('emulsify-drupal');
  });

  it('can return void if given an invalid git url', () => {
    expect.assertions(2);
    expect(getGitRepoNameFromUrl('')).toBe(undefined);
    expect(
      getGitRepoNameFromUrl('https://github.com/emulsify-ds/emulsify-drupal')
    ).toBe(undefined);
  });
});
