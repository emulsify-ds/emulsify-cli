import { execFile } from 'child_process';
import installDependencies from './installDependencies.js';

const execFileMock = execFile as unknown as jest.Mock;
const platform = Object.getOwnPropertyDescriptor(process, 'platform')!;
const directory = process.cwd();

describe('installDependencies', () => {
  afterEach(() => {
    Object.defineProperty(process, 'platform', platform);
    execFileMock.mockClear();
  });

  it.each([
    [false, ['install']],
    [true, ['install', '--ignore-scripts']],
  ])(
    'runs npm directly on Unix with ignoreScripts=%s and resolves stdout',
    async (ignoreScripts, args) => {
      Object.defineProperty(process, 'platform', { value: 'linux' });
      execFileMock.mockImplementationOnce(
        (_command, _args, _options, callback) =>
          callback(null, 'done', 'warning'),
      );
      await expect(
        installDependencies(directory, { ignoreScripts }),
      ).resolves.toBe('done');
      expect(execFileMock).toHaveBeenCalledWith(
        'npm',
        args,
        { cwd: directory, maxBuffer: Infinity, timeout: 600_000, shell: false },
        expect.any(Function),
      );
    },
  );

  it('uses the Windows shell to resolve npm.cmd', async () => {
    Object.defineProperty(process, 'platform', { value: 'win32' });
    execFileMock.mockImplementationOnce((_command, _args, _options, callback) =>
      callback(null, 'done', ''),
    );
    await expect(
      installDependencies(directory, { ignoreScripts: true }),
    ).resolves.toBe('done');
    expect(execFileMock).toHaveBeenCalledWith(
      'npm install --ignore-scripts',
      [],
      { cwd: directory, maxBuffer: Infinity, timeout: 600_000, shell: true },
      expect.any(Function),
    );
  });

  it('collects more than 1 MiB of stderr from a successful child', async () => {
    const { execFile: realExecFile } =
      jest.requireActual<typeof import('child_process')>('child_process');
    const outputBytes = 2 * 1024 * 1024;
    execFileMock.mockImplementationOnce((_command, _args, options, callback) =>
      realExecFile(
        process.execPath,
        ['-e', `process.stderr.write('x'.repeat(${outputBytes}));`],
        { ...options, shell: false },
        callback,
      ),
    );

    await expect(installDependencies(directory)).resolves.toHaveLength(
      outputBytes,
    );
  });

  it('rejects with the child error', async () => {
    const error = new Error('npm exited with status 1');
    execFileMock.mockImplementationOnce((_command, _args, _options, callback) =>
      callback(error),
    );
    await expect(installDependencies(directory)).rejects.toBe(error);
  });
});
