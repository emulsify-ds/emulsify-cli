import CliError from '../../lib/CliError.js';

type NonInteractivePromptBehavior<T> = { error: string } | { value: T };

export type RunPromptOptions<T> = {
  prompt: () => Promise<T>;
  nonInteractive: NonInteractivePromptBehavior<T>;
  accept?: {
    when: boolean;
    value: T;
  };
};

/**
 * Whether stdin belongs to an interactive terminal that can safely show a prompt.
 */
export function isInteractiveTerminal(): boolean {
  return process.stdin.isTTY === true;
}

/**
 * Require an interactive terminal before code proceeds to a prompt.
 *
 * @param nonInteractiveError actionable error shown when stdin is not a TTY.
 * @throws {CliError} when stdin is not an interactive terminal.
 */
export function requireInteractiveTerminal(nonInteractiveError: string): void {
  if (!isInteractiveTerminal()) {
    throw new CliError(nonInteractiveError);
  }
}

/**
 * Identify the error Inquirer throws when a user cancels a prompt with Ctrl-C.
 *
 * @remarks `@inquirer/prompts` does not export this error class, so use its
 * stable Error name without depending directly on Inquirer's internal package.
 */
export function isExitPromptError(error: unknown): error is Error {
  return error instanceof Error && error.name === 'ExitPromptError';
}

/**
 * Run a prompt only when stdin is interactive, with explicit behavior for all
 * other environments. An accepted value (for example, an opt-in `--yes`
 * default) always takes precedence over terminal detection.
 */
export async function runPrompt<T>({
  prompt,
  nonInteractive,
  accept,
}: RunPromptOptions<T>): Promise<T> {
  if (accept?.when === true) {
    return accept.value;
  }

  if ('error' in nonInteractive) {
    requireInteractiveTerminal(nonInteractive.error);
    return prompt();
  }

  if (!isInteractiveTerminal()) {
    return nonInteractive.value;
  }

  return prompt();
}
