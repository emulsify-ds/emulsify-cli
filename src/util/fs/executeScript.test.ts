import { execFile } from 'child_process';
import executeScript from './executeScript.js';

jest.mock('child_process', () => ({
  execFile: jest.fn(),
}));

const execFileMock = execFile as unknown as jest.Mock;

type ExecFileCallback = (
  error: Error | null,
  stdout: string,
  stderr: string,
) => void;

function mockExecFileResult(
  error: Error | null,
  stdout = '',
  stderr = '',
): void {
  execFileMock.mockImplementationOnce(
    (
      _command: string,
      _args: string[],
      _options: { cwd: string; encoding: string },
      callback: ExecFileCallback,
    ) => {
      callback(error, stdout, stderr);
    },
  );
}

describe('executeScript', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('executes a hook script with node and resolves stdout', async () => {
    expect.assertions(2);
    const scriptPath = '/project/.cli/init.js';
    mockExecFileResult(null, 'done');

    await expect(executeScript(scriptPath)).resolves.toBe('done');
    expect(execFileMock).toHaveBeenCalledWith(
      process.execPath,
      [scriptPath],
      {
        cwd: '/project/.cli',
        encoding: 'utf8',
      },
      expect.any(Function),
    );
  });

  it('passes a hook path with spaces as an argument instead of a shell string', async () => {
    expect.assertions(1);
    const scriptPath = '/project with spaces/.cli/init.js';
    mockExecFileResult(null, 'done');

    await executeScript(scriptPath);

    expect(execFileMock).toHaveBeenCalledWith(
      process.execPath,
      [scriptPath],
      {
        cwd: '/project with spaces/.cli',
        encoding: 'utf8',
      },
      expect.any(Function),
    );
  });

  it('resolves stderr when stdout is empty', async () => {
    expect.assertions(1);
    mockExecFileResult(null, '', 'well, that went poorly');

    await expect(executeScript('/project/.cli/init.js')).resolves.toBe(
      'well, that went poorly',
    );
  });

  it('resolves an empty string when stdout and stderr are empty', async () => {
    expect.assertions(1);
    mockExecFileResult(null);

    await expect(executeScript('/project/.cli/init.js')).resolves.toBe('');
  });

  it('rejects failed hooks with stderr context', async () => {
    expect.assertions(1);
    mockExecFileResult(new Error('Command failed'), '', 'hook failed\n');

    await expect(executeScript('/project/.cli/init.js')).rejects.toThrow(
      'Unable to execute hook script "/project/.cli/init.js": hook failed',
    );
  });

  it('rejects execution failures with the process error message', async () => {
    expect.assertions(1);
    mockExecFileResult(new Error('spawn failed'));

    await expect(executeScript('/project/.cli/init.js')).rejects.toThrow(
      'Unable to execute hook script "/project/.cli/init.js": spawn failed',
    );
  });
});
