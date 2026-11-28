import { EventEmitter } from 'node:events';
import {
  cancel as renderCancel,
  intro as renderIntro,
  note as renderNote,
  outro as renderOutro,
  spinner as createSpinner,
} from '@clack/prompts';

import {
  cancelSession,
  finishSession,
  getDiagnosticOutput,
  getSessionFailureSummary,
  isSessionOpen,
  markSessionMayHaveChanges,
  note,
  onAbort,
  resetSessionForTesting,
  spinner,
  startSession,
  stripAnsi,
} from './session.js';

const introMock = renderIntro as jest.Mock;
const outroMock = renderOutro as jest.Mock;
const cancelMock = renderCancel as jest.Mock;
const noteMock = renderNote as jest.Mock;
const spinnerMock = createSpinner as jest.Mock;

describe('stripAnsi', () => {
  it('removes color and cursor sequences', () => {
    expect(stripAnsi('[32mdone[39m')).toBe('done');
    expect(stripAnsi('[1G[0Kredraw')).toBe('redraw');
  });

  it('leaves plain text and box-drawing characters untouched', () => {
    expect(stripAnsi('│  emulsify init')).toBe('│  emulsify init');
  });
});

describe('getDiagnosticOutput', () => {
  it('writes straight to an interactive stream', () => {
    const stream = { isTTY: true, write: jest.fn() };

    expect(getDiagnosticOutput(stream as unknown as NodeJS.WriteStream)).toBe(
      stream,
    );
  });

  it('strips color when the stream is redirected to a file', () => {
    const write = jest.fn();
    const stream = { isTTY: false, write };

    const output = getDiagnosticOutput(stream as unknown as NodeJS.WriteStream);
    output.write('[31mfailed[39m');

    // Redirecting stderr must not leave escape sequences in the file, even
    // while stdout is still a terminal.
    expect(write).toHaveBeenCalledWith('failed');
  });
});

const originalStdoutIsTTY = process.stdout.isTTY;

function setStdoutIsTTY(value: boolean | undefined): void {
  Object.defineProperty(process.stdout, 'isTTY', {
    value,
    configurable: true,
  });
}

describe('session framing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetSessionForTesting();
    setStdoutIsTTY(true);
  });

  afterAll(() => {
    setStdoutIsTTY(originalStdoutIsTTY);
  });

  it('only promises a clean failure before writes can begin', () => {
    const cancellation = 'Cancelled. Nothing was changed.';
    startSession('emulsify component install');
    expect(getSessionFailureSummary()).toBe('No changes were made.');
    expect(getSessionFailureSummary(cancellation)).toBe(cancellation);

    markSessionMayHaveChanges();
    expect(getSessionFailureSummary()).toBe('Command failed.');
    expect(getSessionFailureSummary(cancellation)).toBe('Cancelled.');

    cancelSession(getSessionFailureSummary());
    startSession('emulsify component list');
    expect(getSessionFailureSummary()).toBe('No changes were made.');
  });

  it('opens and closes exactly once', () => {
    expect(isSessionOpen()).toBe(false);

    startSession('emulsify init');
    expect(isSessionOpen()).toBe(true);
    expect(introMock).toHaveBeenCalledWith('emulsify init');

    startSession('emulsify init');
    expect(introMock).toHaveBeenCalledTimes(1);

    finishSession('done');
    expect(isSessionOpen()).toBe(false);
    expect(outroMock).toHaveBeenCalledWith('done');

    finishSession('done again');
    expect(outroMock).toHaveBeenCalledTimes(1);
  });

  it('closes a cancelled session with its reason', () => {
    startSession('emulsify system detach');
    cancelSession('Nothing was changed.');

    expect(cancelMock).toHaveBeenCalledWith('Nothing was changed.');
    expect(isSessionOpen()).toBe(false);
  });

  it('ignores a cancellation when no session is open', () => {
    cancelSession('Nothing was changed.');

    expect(cancelMock).not.toHaveBeenCalled();
  });

  it('renders a titled block', () => {
    note('a\nb', 'Next');

    expect(noteMock).toHaveBeenCalledWith('a\nb', 'Next');
  });

  it('creates a spinner that reports elapsed time rather than a fake total', () => {
    spinner();

    expect(spinnerMock).toHaveBeenCalledWith({
      indicator: 'timer',
      output: process.stdout,
    });
  });

  describe('outside a terminal', () => {
    beforeEach(() => {
      setStdoutIsTTY(false);
    });

    it('draws no frame, but still reports the closing summary', () => {
      const stdoutWrite = jest
        .spyOn(process.stdout, 'write')
        .mockImplementation(() => true);

      startSession('emulsify init');
      finishSession('cornflake is ready');

      expect(introMock).not.toHaveBeenCalled();
      expect(outroMock).not.toHaveBeenCalled();
      expect(stdoutWrite).toHaveBeenCalledWith('cornflake is ready\n');

      stdoutWrite.mockRestore();
    });

    it('reports a cancellation on stderr without a frame', () => {
      const stderrWrite = jest
        .spyOn(process.stderr, 'write')
        .mockImplementation(() => true);

      startSession('emulsify system detach');
      cancelSession('Nothing was changed.');

      expect(cancelMock).not.toHaveBeenCalled();
      expect(stderrWrite).toHaveBeenCalledWith('Nothing was changed.\n');

      stderrWrite.mockRestore();
    });

    it('writes a block as plain lines', () => {
      const stdoutWrite = jest
        .spyOn(process.stdout, 'write')
        .mockImplementation(() => true);

      note('a\nb', 'Next');

      expect(noteMock).not.toHaveBeenCalled();
      expect(stdoutWrite).toHaveBeenCalledWith('Next\na\nb\n');

      stdoutWrite.mockRestore();
    });

    it('reports spinner phases as plain lines instead of animating', () => {
      const stdoutWrite = jest
        .spyOn(process.stdout, 'write')
        .mockImplementation(() => true);

      const progress = spinner();
      progress.start('Cloning the starter');
      progress.message('Installing dependencies');
      progress.stop('Created cornflake');
      progress.clear();

      expect(spinnerMock).not.toHaveBeenCalled();
      expect(progress.isCancelled).toBe(false);
      expect(stdoutWrite).toHaveBeenCalledWith('Cloning the starter\n');
      expect(stdoutWrite).toHaveBeenCalledWith('Installing dependencies\n');
      expect(stdoutWrite).toHaveBeenCalledWith('Created cornflake\n');

      stdoutWrite.mockRestore();
    });

    it('sends spinner failures to stderr and skips empty phases', () => {
      const stderrWrite = jest
        .spyOn(process.stderr, 'write')
        .mockImplementation(() => true);

      const progress = spinner();
      progress.error('Could not finish cloning the starter');
      progress.cancel('Cancelled');
      progress.stop();

      expect(stderrWrite).toHaveBeenCalledWith(
        'Could not finish cloning the starter\n',
      );
      expect(stderrWrite).toHaveBeenCalledWith('Cancelled\n');

      stderrWrite.mockRestore();
    });
  });
});

describe('spinner cancellation', () => {
  function createRuntime() {
    const stdout = { fd: 1, isTTY: true, write: jest.fn() };
    const stderr = { fd: 2, isTTY: true, write: jest.fn() };
    return Object.assign(new EventEmitter(), {
      stdout: stdout as unknown as NodeJS.Process['stdout'],
      stderr: stderr as unknown as NodeJS.Process['stderr'],
      exitCode: undefined as number | undefined,
    });
  }

  afterEach(() => {
    resetSessionForTesting();
  });

  it('sets exit status 130 and runs active cleanups on a zero-code exit', () => {
    const runtime = createRuntime();
    const cleanup = jest.fn();
    const disposedCleanup = jest.fn();
    const dispose = onAbort(disposedCleanup);
    onAbort(cleanup);
    const progress = spinner(runtime);
    expect(runtime.listenerCount('exit')).toBe(0);

    dispose();
    progress.start('Cloning the starter');
    runtime.emit('exit', 0);

    expect(runtime.exitCode).toBe(130);
    expect(cleanup).toHaveBeenCalledTimes(1);
    expect(disposedCleanup).not.toHaveBeenCalled();
  });

  it.each(['stop', 'cancel', 'error', 'clear'] as const)(
    'detaches the listener after %s and preserves a later successful exit',
    (end) => {
      const runtime = createRuntime();
      const cleanup = jest.fn();
      onAbort(cleanup);
      const progress = spinner(runtime);

      progress.start('Cloning the starter');
      expect(runtime.listenerCount('exit')).toBe(1);
      progress[end]();
      expect(runtime.listenerCount('exit')).toBe(0);
      runtime.emit('exit', 0);

      expect(runtime.exitCode).toBeUndefined();
      expect(cleanup).not.toHaveBeenCalled();
    },
  );

  it('releases listeners after nested and sequential spinners', () => {
    const runtime = createRuntime();
    const outer = spinner(runtime);
    const inner = spinner(runtime);

    outer.start();
    inner.start();
    inner.stop();
    expect(runtime.listenerCount('exit')).toBe(1);
    outer.stop();
    expect(runtime.listenerCount('exit')).toBe(0);

    inner.start();
    expect(runtime.listenerCount('exit')).toBe(1);
    inner.stop();
    expect(runtime.listenerCount('exit')).toBe(0);
  });

  it('runs each abort cleanup once when two spinners are active', () => {
    const runtime = createRuntime();
    const cleanup = jest.fn();
    const failingCleanup = jest.fn(() => {
      throw new Error('Could not clean up');
    });
    onAbort(failingCleanup);
    onAbort(cleanup);

    spinner(runtime).start();
    spinner(runtime).start();
    runtime.emit('exit', 0);

    expect(runtime.exitCode).toBe(130);
    expect(failingCleanup).toHaveBeenCalledTimes(1);
    expect(cleanup).toHaveBeenCalledTimes(1);
    expect(runtime.stderr.write).toHaveBeenCalledWith(
      'Error: Could not clean up\n',
    );
  });

  it('preserves a nonzero exit code while a spinner is active', () => {
    const runtime = createRuntime();
    const cleanup = jest.fn();
    onAbort(cleanup);

    spinner(runtime).start();
    runtime.exitCode = 1;
    runtime.emit('exit', 1);

    expect(runtime.exitCode).toBe(1);
    expect(cleanup).not.toHaveBeenCalled();
  });
});
