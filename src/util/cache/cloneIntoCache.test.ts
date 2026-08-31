jest.mock('../../lib/constants', () => ({
  CACHE_DIR: 'cache',
  EMULSIFY_CACHE_METADATA_FILE: '.emulsify-cache.json',
  EMULSIFY_PROJECT_CONFIG_FILE: 'project.emulsify.json',
}));
jest.mock('../fs/findFileInCurrentPath', () => jest.fn());

import cloneIntoCache from './cloneIntoCache.js';
import findFileInCurrentPath from '../fs/findFileInCurrentPath.js';

import fs from 'fs';
import { createHash } from 'crypto';
import { basename, dirname, join, resolve } from 'path';
import { simpleGit } from 'simple-git';

const existsSyncMock = fs.existsSync as jest.Mock;
const readFileMock = fs.promises.readFile as jest.Mock;
const writeFileMock = fs.promises.writeFile as jest.Mock;
const readdirMock = fs.promises.readdir as jest.Mock;
const rmMock = fs.promises.rm as jest.Mock;
const mkdirMock = fs.promises.mkdir as jest.Mock;
const mkdtempMock = fs.promises.mkdtemp as jest.Mock;
const renameMock = fs.promises.rename as jest.Mock;
const statMock = fs.promises.stat as jest.Mock;
const copyFileMock = fs.promises.copyFile as jest.Mock;
const simpleGitMock = simpleGit as unknown as jest.Mock;
const gitMock = simpleGit();
const gitCloneMock = gitMock.clone as jest.Mock;
const getRemotesMock = gitMock.getRemotes as jest.Mock;
const listRemoteMock = gitMock.listRemote as jest.Mock;
const envMock = gitMock.env as jest.Mock;
const revparseMock = gitMock.revparse as jest.Mock;

const projectPath = resolve('fixtures', 'emulsify');
const cloneOptions = {
  repository: 'repo-path',
  checkout: 'branch-name',
};
const normalizedRepository = resolve(cloneOptions.repository);

function cacheDestination(checkout: string | void): string {
  const hash = createHash('md5')
    .update(
      JSON.stringify({
        projectPath,
        repository: normalizedRepository,
        checkout: checkout || '',
      }),
    )
    .digest('hex');
  return join('cache', 'systems', hash, 'cornflake');
}

const destination = cacheDestination(cloneOptions.checkout);
const metadataPath = join(destination, '.emulsify-cache.json');
const temporaryDestinationPrefix = `${destination}.tmp-${process.pid}-`;
const temporaryDestination = `${temporaryDestinationPrefix}abc123`;
const temporaryMetadataPath = join(
  temporaryDestination,
  '.emulsify-cache.json',
);

function metadata(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    repository: normalizedRepository,
    checkout: 'branch-name',
    resolvedRef: 'resolved-ref',
    clonedAt: '2026-08-29T12:00:00.000Z',
    complete: true,
    ...overrides,
  });
}

describe('cloneIntoCache', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (findFileInCurrentPath as jest.Mock).mockReturnValue(projectPath);
    existsSyncMock.mockReturnValue(false);
    readFileMock.mockRejectedValue(
      Object.assign(new Error('missing'), { code: 'ENOENT' }),
    );
    writeFileMock.mockResolvedValue(undefined);
    readdirMock.mockResolvedValue([]);
    rmMock.mockResolvedValue(undefined);
    mkdirMock.mockResolvedValue(undefined);
    mkdtempMock.mockImplementation(async (prefix: string) => `${prefix}abc123`);
    renameMock.mockResolvedValue(undefined);
    statMock.mockResolvedValue({ mtimeMs: Date.now() });
    gitCloneMock.mockResolvedValue(undefined);
    getRemotesMock.mockResolvedValue([
      {
        name: 'origin',
        refs: {
          fetch: normalizedRepository,
          push: normalizedRepository,
        },
      },
    ]);
    listRemoteMock.mockResolvedValue('');
    revparseMock.mockResolvedValue('resolved-ref\n');
  });

  it('clones into the repository-aware path and writes complete metadata', async () => {
    await cloneIntoCache('systems', ['cornflake'])(cloneOptions);

    expect(mkdirMock).toHaveBeenCalledWith(dirname(destination), {
      recursive: true,
    });
    expect(mkdtempMock).toHaveBeenCalledWith(temporaryDestinationPrefix);
    expect(gitCloneMock).toHaveBeenCalledWith(
      normalizedRepository,
      temporaryDestination,
      {
        '--branch': 'branch-name',
      },
    );
    expect(simpleGitMock).toHaveBeenCalledWith(temporaryDestination);
    expect(revparseMock).toHaveBeenCalledWith(['HEAD']);
    expect(writeFileMock).toHaveBeenCalledWith(
      temporaryMetadataPath,
      expect.any(String),
      { encoding: 'utf-8' },
    );
    expect(renameMock).toHaveBeenCalledWith(temporaryDestination, destination);
    expect(copyFileMock).not.toHaveBeenCalled();

    const writtenMetadata = JSON.parse(writeFileMock.mock.calls[0][1]);
    expect(writtenMetadata).toEqual({
      repository: normalizedRepository,
      checkout: 'branch-name',
      resolvedRef: 'resolved-ref',
      clonedAt: expect.any(String),
      complete: true,
    });
    expect(Number.isNaN(Date.parse(writtenMetadata.clonedAt))).toBe(false);
  });

  it('keeps the final entry untouched until a complete clone is ready', async () => {
    existsSyncMock.mockReturnValue(true);
    let markCloneStarted: (() => void) | undefined;
    let resolveClone: (() => void) | undefined;
    const cloneStarted = new Promise<void>((resolve) => {
      markCloneStarted = resolve;
    });
    gitCloneMock.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          resolveClone = resolve;
          markCloneStarted?.();
        }),
    );

    const clonePromise = cloneIntoCache('systems', ['cornflake'])(cloneOptions);
    await cloneStarted;

    expect(writeFileMock).not.toHaveBeenCalled();
    expect(rmMock).not.toHaveBeenCalledWith(destination, {
      recursive: true,
      force: true,
    });
    expect(renameMock).not.toHaveBeenCalled();

    resolveClone?.();
    await clonePromise;

    const writeOrder = writeFileMock.mock.invocationCallOrder[0];
    const removeOrder = rmMock.mock.invocationCallOrder.find(
      (_, index) => rmMock.mock.calls[index][0] === destination,
    );
    const renameOrder = renameMock.mock.invocationCallOrder[0];
    expect(writeOrder).toBeLessThan(removeOrder as number);
    expect(removeOrder).toBeLessThan(renameOrder);
  });

  it('cleans its temp directory without touching the final entry when cloning fails', async () => {
    existsSyncMock.mockReturnValue(true);
    gitCloneMock.mockRejectedValueOnce(new Error('clone failed'));
    rmMock.mockRejectedValueOnce(new Error('cleanup failed'));

    await expect(
      cloneIntoCache('systems', ['cornflake'])(cloneOptions),
    ).rejects.toThrow('clone failed');
    expect(writeFileMock).not.toHaveBeenCalled();
    expect(renameMock).not.toHaveBeenCalled();
    expect(rmMock).toHaveBeenCalledWith(temporaryDestination, {
      recursive: true,
      force: true,
    });
    expect(rmMock).not.toHaveBeenCalledWith(destination, {
      recursive: true,
      force: true,
    });
  });

  it('reuses a complete entry that wins a concurrent rename', async () => {
    existsSyncMock
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true);
    readFileMock.mockResolvedValueOnce(metadata());
    renameMock.mockRejectedValueOnce(
      Object.assign(new Error('destination exists'), { code: 'ENOTEMPTY' }),
    );

    await expect(
      cloneIntoCache('systems', ['cornflake'])(cloneOptions),
    ).resolves.toBeUndefined();

    expect(renameMock).toHaveBeenCalledWith(temporaryDestination, destination);
    expect(rmMock).not.toHaveBeenCalledWith(destination, {
      recursive: true,
      force: true,
    });
    expect(rmMock).toHaveBeenCalledWith(temporaryDestination, {
      recursive: true,
      force: true,
    });
  });

  it('cleans abandoned temp directories without removing active peers', async () => {
    const abandonedName = `${basename(destination)}.tmp-12345-abc123`;
    const abandonedPath = join(dirname(destination), abandonedName);
    const activeName = `${basename(destination)}.tmp-67890-def456`;
    const activePath = join(dirname(destination), activeName);
    const legitimateName = `${basename(destination)}.tmp-custom`;
    const legitimatePath = join(dirname(destination), legitimateName);
    existsSyncMock.mockReturnValueOnce(true);
    readFileMock.mockResolvedValueOnce(metadata());
    readdirMock.mockResolvedValueOnce([
      {
        name: abandonedName,
        isDirectory: () => true,
      },
      {
        name: activeName,
        isDirectory: () => true,
      },
      {
        name: legitimateName,
        isDirectory: () => true,
      },
    ]);
    statMock
      .mockResolvedValueOnce({
        mtimeMs: Date.now() - 24 * 60 * 60 * 1_000 - 1,
      })
      .mockResolvedValueOnce({ mtimeMs: Date.now() });

    await cloneIntoCache('systems', ['cornflake'])(cloneOptions);

    expect(rmMock).toHaveBeenCalledWith(abandonedPath, {
      recursive: true,
      force: true,
    });
    expect(rmMock).not.toHaveBeenCalledWith(activePath, {
      recursive: true,
      force: true,
    });
    expect(rmMock).not.toHaveBeenCalledWith(legitimatePath, {
      recursive: true,
      force: true,
    });
    expect(gitCloneMock).not.toHaveBeenCalled();
    expect(renameMock).not.toHaveBeenCalled();
  });

  it('reuses a complete cache entry without contacting the remote by default', async () => {
    existsSyncMock.mockReturnValueOnce(true);
    readFileMock.mockResolvedValueOnce(metadata());

    await cloneIntoCache('systems', ['cornflake'])(cloneOptions);

    expect(readFileMock).toHaveBeenCalledWith(metadataPath, {
      encoding: 'utf-8',
    });
    expect(gitCloneMock).not.toHaveBeenCalled();
    expect(rmMock).not.toHaveBeenCalled();
    expect(writeFileMock).not.toHaveBeenCalled();
    expect(listRemoteMock).not.toHaveBeenCalled();
  });

  it('reuses a valid local entry when the remote cannot be reached', async () => {
    existsSyncMock.mockReturnValueOnce(true);
    readFileMock.mockResolvedValueOnce(metadata());
    listRemoteMock.mockRejectedValueOnce(new Error('offline'));

    await cloneIntoCache('systems', ['cornflake'], { refresh: true })(
      cloneOptions,
    );

    expect(gitCloneMock).not.toHaveBeenCalled();
    expect(rmMock).not.toHaveBeenCalled();
  });

  it('reuses a valid local entry when the remote lookup times out', async () => {
    existsSyncMock.mockReturnValueOnce(true);
    readFileMock.mockResolvedValueOnce(metadata());
    listRemoteMock.mockRejectedValueOnce(
      Object.assign(new Error('block timeout reached'), { plugin: 'timeout' }),
    );

    await cloneIntoCache('systems', ['cornflake'], { refresh: true })(
      cloneOptions,
    );

    expect(gitCloneMock).not.toHaveBeenCalled();
    expect(rmMock).not.toHaveBeenCalled();
  });

  it('bounds remote lookups and disables Git and SSH prompts', async () => {
    existsSyncMock.mockReturnValueOnce(true);
    readFileMock.mockResolvedValueOnce(metadata());
    listRemoteMock.mockResolvedValueOnce(
      'resolved-ref\trefs/heads/branch-name\n',
    );

    await cloneIntoCache('systems', ['cornflake'], { refresh: true })(
      cloneOptions,
    );

    expect(simpleGitMock).toHaveBeenCalledWith({
      timeout: {
        block: 2_000,
        stdOut: false,
        stdErr: false,
      },
    });
    expect(envMock).toHaveBeenCalledWith({
      ...process.env,
      GIT_TERMINAL_PROMPT: '0',
      GIT_SSH_COMMAND: process.env.GIT_SSH_COMMAND || 'ssh -oBatchMode=yes',
    });
  });

  it('reuses a valid default-branch entry when remote HEAD matches', async () => {
    const defaultDestination = cacheDestination(undefined);
    existsSyncMock.mockReturnValueOnce(true);
    readFileMock.mockResolvedValueOnce(metadata({ checkout: null }));
    listRemoteMock.mockResolvedValueOnce('resolved-ref\tHEAD\n');

    await cloneIntoCache('systems', ['cornflake'], { refresh: true })({
      repository: 'repo-path',
    });

    expect(readFileMock).toHaveBeenCalledWith(
      join(defaultDestination, '.emulsify-cache.json'),
      { encoding: 'utf-8' },
    );
    expect(listRemoteMock).toHaveBeenCalledWith([normalizedRepository, 'HEAD']);
    expect(gitCloneMock).not.toHaveBeenCalled();
    expect(rmMock).not.toHaveBeenCalled();
  });

  it('reuses a valid entry when the checkout is not a remote branch', async () => {
    existsSyncMock.mockReturnValueOnce(true);
    readFileMock.mockResolvedValueOnce(metadata());
    listRemoteMock.mockResolvedValueOnce(
      'resolved-ref\trefs/tags/branch-name\n',
    );

    await cloneIntoCache('systems', ['cornflake'], { refresh: true })(
      cloneOptions,
    );

    expect(listRemoteMock).toHaveBeenCalledWith([
      normalizedRepository,
      'refs/heads/branch-name',
      'refs/tags/branch-name^{}',
      'refs/tags/branch-name',
    ]);
    expect(gitCloneMock).not.toHaveBeenCalled();
    expect(rmMock).not.toHaveBeenCalled();
  });

  it('prefers the peeled commit for an annotated tag', async () => {
    existsSyncMock.mockReturnValueOnce(true);
    readFileMock.mockResolvedValueOnce(metadata());
    listRemoteMock.mockResolvedValueOnce(
      [
        'tag-object\trefs/tags/branch-name',
        'resolved-ref\trefs/tags/branch-name^{}',
      ].join('\n'),
    );

    await cloneIntoCache('systems', ['cornflake'], { refresh: true })(
      cloneOptions,
    );

    expect(gitCloneMock).not.toHaveBeenCalled();
    expect(rmMock).not.toHaveBeenCalled();
  });

  it('re-clones when the requested branch or tag no longer exists', async () => {
    existsSyncMock.mockReturnValue(true);
    readFileMock.mockResolvedValueOnce(metadata());
    listRemoteMock.mockResolvedValueOnce('');

    await cloneIntoCache('systems', ['cornflake'], { refresh: true })(
      cloneOptions,
    );

    expect(rmMock).toHaveBeenCalledTimes(1);
    expect(gitCloneMock).toHaveBeenCalledTimes(1);
  });

  it('removes and re-clones an entry with no sidecar', async () => {
    existsSyncMock.mockReturnValue(true);

    await cloneIntoCache('systems', ['cornflake'])(cloneOptions);

    expect(rmMock).toHaveBeenCalledWith(destination, {
      recursive: true,
      force: true,
    });
    expect(gitCloneMock).toHaveBeenCalledTimes(1);
  });

  it('removes and re-clones an entry with malformed sidecar JSON', async () => {
    existsSyncMock.mockReturnValue(true);
    readFileMock.mockResolvedValueOnce('{not-json');

    await cloneIntoCache('systems', ['cornflake'])(cloneOptions);

    expect(rmMock).toHaveBeenCalledTimes(1);
    expect(gitCloneMock).toHaveBeenCalledTimes(1);
  });

  it.each([
    null,
    { repository: 123 },
    { repository: 'repo-path', checkout: 123 },
    {
      repository: 'repo-path',
      checkout: 'branch-name',
      resolvedRef: 123,
    },
    {
      repository: 'repo-path',
      checkout: 'branch-name',
      resolvedRef: '',
      clonedAt: '2026-08-29T12:00:00.000Z',
      complete: true,
    },
    {
      repository: 'repo-path',
      checkout: 'branch-name',
      resolvedRef: 'resolved-ref',
      clonedAt: 123,
      complete: true,
    },
    {
      repository: 'repo-path',
      checkout: 'branch-name',
      resolvedRef: 'resolved-ref',
      clonedAt: 'not-a-date',
      complete: true,
    },
    {
      repository: 'repo-path',
      checkout: 'branch-name',
      resolvedRef: 'resolved-ref',
      clonedAt: '2026-08-29T12:00:00.000Z',
      complete: false,
    },
  ])('re-clones an entry with incomplete metadata: %p', async (value) => {
    existsSyncMock.mockReturnValue(true);
    readFileMock.mockResolvedValueOnce(JSON.stringify(value));

    await cloneIntoCache('systems', ['cornflake'])(cloneOptions);

    expect(rmMock).toHaveBeenCalledTimes(1);
    expect(gitCloneMock).toHaveBeenCalledTimes(1);
  });

  it('removes and re-clones an entry for a different repository', async () => {
    existsSyncMock.mockReturnValue(true);
    readFileMock.mockResolvedValueOnce(
      metadata({ repository: 'different-repo-path' }),
    );

    await cloneIntoCache('systems', ['cornflake'])(cloneOptions);

    expect(getRemotesMock).not.toHaveBeenCalled();
    expect(rmMock).toHaveBeenCalledTimes(1);
    expect(gitCloneMock).toHaveBeenCalledTimes(1);
  });

  it('removes and re-clones an entry whose origin does not match', async () => {
    existsSyncMock.mockReturnValue(true);
    readFileMock.mockResolvedValueOnce(metadata());
    getRemotesMock.mockResolvedValueOnce([
      {
        name: 'origin',
        refs: { fetch: 'different-repo-path', push: 'repo-path' },
      },
    ]);

    await cloneIntoCache('systems', ['cornflake'])(cloneOptions);

    expect(rmMock).toHaveBeenCalledTimes(1);
    expect(gitCloneMock).toHaveBeenCalledTimes(1);
  });

  it('removes and re-clones an entry whose origin cannot be inspected', async () => {
    existsSyncMock.mockReturnValue(true);
    readFileMock.mockResolvedValueOnce(metadata());
    getRemotesMock.mockRejectedValueOnce(new Error('not a git repository'));

    await cloneIntoCache('systems', ['cornflake'])(cloneOptions);

    expect(rmMock).toHaveBeenCalledTimes(1);
    expect(gitCloneMock).toHaveBeenCalledTimes(1);
  });

  it('removes and re-clones an entry whose local HEAD changed', async () => {
    existsSyncMock.mockReturnValue(true);
    readFileMock.mockResolvedValueOnce(metadata());
    revparseMock
      .mockResolvedValueOnce('different-local-ref\n')
      .mockResolvedValueOnce('resolved-ref\n');

    await cloneIntoCache('systems', ['cornflake'])(cloneOptions);

    expect(rmMock).toHaveBeenCalledTimes(1);
    expect(gitCloneMock).toHaveBeenCalledTimes(1);
  });

  it('removes and re-clones when a moving remote ref advances', async () => {
    existsSyncMock.mockReturnValue(true);
    readFileMock.mockResolvedValueOnce(metadata());
    listRemoteMock.mockResolvedValueOnce(
      'new-resolved-ref\trefs/heads/branch-name\n',
    );

    await cloneIntoCache('systems', ['cornflake'], { refresh: true })(
      cloneOptions,
    );

    expect(rmMock).toHaveBeenCalledTimes(1);
    expect(gitCloneMock).toHaveBeenCalledTimes(1);
  });

  it('clones the default branch and records an explicit null checkout', async () => {
    const defaultDestination = cacheDestination(undefined);

    await cloneIntoCache('systems', ['cornflake'])({
      repository: 'repo-path',
    });

    expect(gitCloneMock).toHaveBeenCalledWith(
      normalizedRepository,
      `${defaultDestination}.tmp-${process.pid}-abc123`,
      {},
    );
    const writtenMetadata = JSON.parse(writeFileMock.mock.calls[0][1]);
    expect(writtenMetadata.checkout).toBeNull();
  });
});
