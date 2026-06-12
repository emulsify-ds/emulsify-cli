import getRepositoryLatestTag from './getRepositoryLatestTag.js';
import { execFile } from 'child_process';
import { simpleGit } from 'simple-git';

jest.mock('child_process', () => ({
  execFile: jest.fn(),
}));
jest.mock('simple-git', () => ({
  simpleGit: jest.fn(),
}));

const execFileMock = execFile as unknown as jest.Mock;
const simpleGitMock = simpleGit as unknown as jest.Mock;
const repoUrl = 'git@github.com:emulsify-ds/compound.git';

type ExecFileCallback = (
  error: Error | null,
  stdout: string,
  stderr: string,
) => void;

function tagRef(tag: string): string {
  return `1e9c710cde438444fe181d0f1dbc5d106dcaeedf\trefs/tags/${tag}`;
}

function mockLsRemoteSuccess(output: string): void {
  execFileMock.mockImplementationOnce(
    (
      _command: string,
      _args: string[],
      _options: { encoding: string },
      callback: ExecFileCallback,
    ) => {
      callback(null, output, '');
    },
  );
}

function mockLsRemoteFailure(stderr: string): void {
  execFileMock.mockImplementationOnce(
    (
      _command: string,
      _args: string[],
      _options: { encoding: string },
      callback: ExecFileCallback,
    ) => {
      callback(new Error('Command failed'), '', stderr);
    },
  );
}

describe('getRepositoryLatestTag', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('parses git ls-remote tag refs from a repository url', async () => {
    expect.assertions(2);
    mockLsRemoteSuccess(tagRef('v1.5.0'));

    const latest = await getRepositoryLatestTag(repoUrl);

    expect(latest).toBe('v1.5.0');
    expect(execFileMock).toHaveBeenCalledWith(
      'git',
      ['ls-remote', '--tags', '--refs', repoUrl],
      { encoding: 'utf8' },
      expect.any(Function),
    );
  });

  it('selects v2.1.0 over v2.0.9', async () => {
    expect.assertions(1);

    mockLsRemoteSuccess([tagRef('v2.0.9'), tagRef('v2.1.0')].join('\n'));

    await expect(getRepositoryLatestTag(repoUrl)).resolves.toBe('v2.1.0');
  });

  it('selects 2.1.0 over 2.0.9', async () => {
    expect.assertions(1);

    mockLsRemoteSuccess([tagRef('2.0.9'), tagRef('2.1.0')].join('\n'));

    await expect(getRepositoryLatestTag(repoUrl)).resolves.toBe('2.1.0');
  });

  it('handles mixed v and non-v tags', async () => {
    expect.assertions(1);

    mockLsRemoteSuccess(
      [tagRef('2.0.10'), tagRef('v2.1.0'), tagRef('v2.0.9')].join('\n'),
    );

    await expect(getRepositoryLatestTag(repoUrl)).resolves.toBe('v2.1.0');
  });

  it('ignores malformed lines and non-tag refs', async () => {
    expect.assertions(1);

    mockLsRemoteSuccess(
      [
        '',
        'malformed',
        '1e9c710cde438444fe181d0f1dbc5d106dcaeedf\trefs/heads/main',
        tagRef('v2.1.0'),
      ].join('\n'),
    );

    await expect(getRepositoryLatestTag(repoUrl)).resolves.toBe('v2.1.0');
  });

  it('ignores non-SemVer tags', async () => {
    expect.assertions(1);

    mockLsRemoteSuccess(
      [
        tagRef('release-3.0.0'),
        tagRef('latest'),
        tagRef('2.0'),
        tagRef('v2.1.0'),
        tagRef('v2.0.9'),
      ].join('\n'),
    );

    await expect(getRepositoryLatestTag(repoUrl)).resolves.toBe('v2.1.0');
  });

  it('selects stable releases over matching prereleases', async () => {
    expect.assertions(2);

    mockLsRemoteSuccess(
      [tagRef('v2.1.0-alpha.1'), tagRef('v2.1.0')].join('\n'),
    );
    await expect(getRepositoryLatestTag(repoUrl)).resolves.toBe('v2.1.0');

    mockLsRemoteSuccess(
      [tagRef('v2.1.0'), tagRef('v2.1.0-alpha.1')].join('\n'),
    );
    await expect(getRepositoryLatestTag(repoUrl)).resolves.toBe('v2.1.0');
  });

  it('orders prerelease identifiers by SemVer precedence', async () => {
    expect.assertions(6);

    mockLsRemoteSuccess(
      [tagRef('v2.1.0-alpha.1'), tagRef('v2.1.0-alpha.2')].join('\n'),
    );
    await expect(getRepositoryLatestTag(repoUrl)).resolves.toBe(
      'v2.1.0-alpha.2',
    );

    mockLsRemoteSuccess(
      [tagRef('v2.1.0-alpha.1'), tagRef('v2.1.0-alpha.1.1')].join('\n'),
    );
    await expect(getRepositoryLatestTag(repoUrl)).resolves.toBe(
      'v2.1.0-alpha.1.1',
    );

    mockLsRemoteSuccess(
      [tagRef('v2.1.0-alpha.1.1'), tagRef('v2.1.0-alpha.1')].join('\n'),
    );
    await expect(getRepositoryLatestTag(repoUrl)).resolves.toBe(
      'v2.1.0-alpha.1.1',
    );

    mockLsRemoteSuccess(
      [tagRef('v2.1.0-alpha.beta'), tagRef('v2.1.0-alpha.1')].join('\n'),
    );
    await expect(getRepositoryLatestTag(repoUrl)).resolves.toBe(
      'v2.1.0-alpha.beta',
    );

    mockLsRemoteSuccess(
      [tagRef('v2.1.0-alpha.1'), tagRef('v2.1.0-alpha.beta')].join('\n'),
    );
    await expect(getRepositoryLatestTag(repoUrl)).resolves.toBe(
      'v2.1.0-alpha.beta',
    );

    mockLsRemoteSuccess(
      [tagRef('v2.1.0-alpha.beta'), tagRef('v2.1.0-alpha.rc')].join('\n'),
    );
    await expect(getRepositoryLatestTag(repoUrl)).resolves.toBe(
      'v2.1.0-alpha.rc',
    );
  });

  it('keeps the first tag when equivalent versions are found', async () => {
    expect.assertions(2);

    mockLsRemoteSuccess([tagRef('v2.1.0'), tagRef('2.1.0')].join('\n'));
    await expect(getRepositoryLatestTag(repoUrl)).resolves.toBe('v2.1.0');

    mockLsRemoteSuccess(
      [tagRef('v2.1.0-alpha'), tagRef('2.1.0-alpha')].join('\n'),
    );
    await expect(getRepositoryLatestTag(repoUrl)).resolves.toBe('v2.1.0-alpha');
  });

  it('throws when no usable SemVer tags are found', async () => {
    expect.assertions(1);

    mockLsRemoteSuccess(
      [tagRef('release-3.0.0'), tagRef('latest'), tagRef('2.0')].join('\n'),
    );

    await expect(getRepositoryLatestTag(repoUrl)).rejects.toThrow(
      `No usable SemVer tags were found in repository ${repoUrl}.`,
    );
  });

  it('throws a helpful error when the repository cannot be read', async () => {
    expect.assertions(1);

    mockLsRemoteFailure('fatal: could not read from remote repository');

    await expect(getRepositoryLatestTag(repoUrl)).rejects.toThrow(
      `Unable to read tags from repository ${repoUrl}: fatal: could not read from remote repository`,
    );
  });

  it('uses the command error message when stderr is empty', async () => {
    expect.assertions(1);

    mockLsRemoteFailure('');

    await expect(getRepositoryLatestTag(repoUrl)).rejects.toThrow(
      `Unable to read tags from repository ${repoUrl}: Command failed`,
    );
  });

  it('does not use simple-git current-directory mutations', async () => {
    expect.assertions(6);
    const gitMock = {
      init: jest.fn(),
      removeRemote: jest.fn(),
      addRemote: jest.fn(),
      fetch: jest.fn(),
      tags: jest.fn(),
    };
    simpleGitMock.mockReturnValue(gitMock);

    mockLsRemoteSuccess(tagRef('v1.5.0'));

    await getRepositoryLatestTag(repoUrl);

    expect(simpleGitMock).not.toHaveBeenCalled();
    expect(gitMock.init).not.toHaveBeenCalled();
    expect(gitMock.removeRemote).not.toHaveBeenCalled();
    expect(gitMock.addRemote).not.toHaveBeenCalled();
    expect(gitMock.fetch).not.toHaveBeenCalled();
    expect(gitMock.tags).not.toHaveBeenCalled();
  });
});
