import { CANCEL_SYMBOL, isCancel } from '@clack/prompts';
import CliError from '../../lib/CliError.js';

/**
 * Value a prompt resolves with, including the cancellation sentinel.
 *
 * @remarks Naming the sentinel concretely rather than as a bare `symbol` keeps
 * inference working, so call sites do not have to restate their value type.
 */
export type PromptResult<T> = T | typeof CANCEL_SYMBOL;

/** Exit code reported when a person cancels a prompt. */
export const PROMPT_CANCELLED_EXIT_CODE = 130;

/** Message shown when a person cancels a prompt. */
export const PROMPT_CANCELLED_MESSAGE = 'Cancelled. Nothing was changed.';

/**
 * Error thrown when a person cancels a prompt with Ctrl-C or Escape.
 *
 * @param message user-facing cancellation message.
 */
export class PromptCancelledError extends CliError {
  constructor(message: string = PROMPT_CANCELLED_MESSAGE) {
    super(message, PROMPT_CANCELLED_EXIT_CODE);
    this.name = 'PromptCancelledError';
  }
}

type NonInteractivePromptBehavior<T> = { error: string } | { value: T };

export type RunPromptOptions<T> = {
  prompt: () => Promise<PromptResult<T>>;
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
 * Identify a cancellation raised by a prompt.
 *
 * @param error value thrown from a prompt or command handler.
 * @returns true when the value represents a cancelled prompt.
 */
export function isPromptCancelledError(
  error: unknown,
): error is PromptCancelledError {
  return error instanceof PromptCancelledError;
}

/**
 * Convert a prompt result into a value, treating cancellation as an error.
 *
 * @remarks Prompts return a cancel symbol rather than throwing, so every prompt
 * result passes through here to keep cancellation handling in one place.
 *
 * @param result value returned by a prompt.
 * @returns the prompt value.
 * @throws {PromptCancelledError} when the person cancelled the prompt.
 */
export function unwrapPromptResult<T>(result: PromptResult<T>): T {
  if (isCancel(result)) {
    throw new PromptCancelledError();
  }

  return result as T;
}

/**
 * Run a prompt only when stdin is interactive, with explicit behavior for all
 * other environments. An accepted value (for example, an opt-in `--yes`
 * default) always takes precedence over terminal detection.
 *
 * @throws {PromptCancelledError} when the person cancelled the prompt.
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
    return unwrapPromptResult(await prompt());
  }

  if (!isInteractiveTerminal()) {
    return nonInteractive.value;
  }

  return unwrapPromptResult(await prompt());
}
