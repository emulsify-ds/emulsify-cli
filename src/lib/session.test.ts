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
  isSessionOpen,
  note,
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

    expect(spinnerMock).toHaveBeenCalledWith({ indicator: 'timer' });
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
