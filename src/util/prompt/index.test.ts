import CliError from '../../lib/CliError.js';
import {
  isExitPromptError,
  isInteractiveTerminal,
  requireInteractiveTerminal,
  runPrompt,
} from './index.js';

const originalStdinIsTTY = process.stdin.isTTY;

function setStdinIsTTY(value: boolean | undefined): void {
  Object.defineProperty(process.stdin, 'isTTY', {
    value,
    configurable: true,
  });
}

describe('prompt utilities', () => {
  afterEach(() => {
    setStdinIsTTY(originalStdinIsTTY);
  });

  describe('isInteractiveTerminal', () => {
    it('returns true only when stdin is explicitly a TTY', () => {
      setStdinIsTTY(true);
      expect(isInteractiveTerminal()).toBe(true);

      setStdinIsTTY(false);
      expect(isInteractiveTerminal()).toBe(false);

      setStdinIsTTY(undefined);
      expect(isInteractiveTerminal()).toBe(false);
    });
  });

  describe('requireInteractiveTerminal', () => {
    it('allows an interactive terminal', () => {
      setStdinIsTTY(true);

      expect(() => requireInteractiveTerminal('Pass --value.')).not.toThrow();
    });

    it('throws the caller-provided CliError in a non-interactive terminal', () => {
      setStdinIsTTY(false);

      let thrown: unknown;
      try {
        requireInteractiveTerminal('Pass --value.');
      } catch (error) {
        thrown = error;
      }

      expect(thrown).toBeInstanceOf(CliError);
      expect(thrown).toMatchObject({
        message: 'Pass --value.',
        exitCode: 1,
      });
    });
  });

  describe('isExitPromptError', () => {
    it("recognizes an Error with Inquirer's cancellation name", () => {
      const error = new Error('User force closed the prompt');
      error.name = 'ExitPromptError';

      expect(isExitPromptError(error)).toBe(true);
    });

    it('rejects other errors and non-Error lookalikes', () => {
      expect(isExitPromptError(new Error('different failure'))).toBe(false);
      expect(isExitPromptError({ name: 'ExitPromptError' })).toBe(false);
    });
  });

  describe('runPrompt', () => {
    it('returns an explicitly accepted value before checking terminal state', async () => {
      setStdinIsTTY(false);
      const prompt = jest.fn<Promise<string>, []>();

      await expect(
        runPrompt({
          prompt,
          nonInteractive: { error: 'Pass --value.' },
          accept: { when: true, value: 'accepted default' },
        }),
      ).resolves.toBe('accepted default');
      expect(prompt).not.toHaveBeenCalled();
    });

    it('runs a required prompt in an interactive terminal', async () => {
      setStdinIsTTY(true);
      const prompt = jest.fn().mockResolvedValue('prompted value');

      await expect(
        runPrompt({
          prompt,
          nonInteractive: { error: 'Pass --value.' },
          accept: { when: false, value: 'unused default' },
        }),
      ).resolves.toBe('prompted value');
      expect(prompt).toHaveBeenCalledTimes(1);
    });

    it('throws before a required prompt in a non-interactive terminal', async () => {
      setStdinIsTTY(false);
      const prompt = jest.fn<Promise<string>, []>();

      await expect(
        runPrompt({
          prompt,
          nonInteractive: { error: 'Pass --value.' },
        }),
      ).rejects.toMatchObject({
        name: 'CliError',
        message: 'Pass --value.',
        exitCode: 1,
      });
      expect(prompt).not.toHaveBeenCalled();
    });

    it('uses a safe fallback without prompting in a non-interactive terminal', async () => {
      setStdinIsTTY(undefined);
      const prompt = jest.fn<Promise<boolean>, []>();

      await expect(
        runPrompt({
          prompt,
          nonInteractive: { value: false },
        }),
      ).resolves.toBe(false);
      expect(prompt).not.toHaveBeenCalled();
    });

    it('runs a prompt instead of using its fallback in an interactive terminal', async () => {
      setStdinIsTTY(true);
      const prompt = jest.fn().mockResolvedValue(true);

      await expect(
        runPrompt({
          prompt,
          nonInteractive: { value: false },
        }),
      ).resolves.toBe(true);
      expect(prompt).toHaveBeenCalledTimes(1);
    });

    it('preserves prompt cancellation errors for the top-level handler', async () => {
      setStdinIsTTY(true);
      const cancellation = new Error('User force closed the prompt');
      cancellation.name = 'ExitPromptError';

      await expect(
        runPrompt({
          prompt: async () => {
            throw cancellation;
          },
          nonInteractive: { error: 'Pass --value.' },
        }),
      ).rejects.toBe(cancellation);
    });
  });
});
