/**
 * @file session.ts
 * Shared session framing for every command that talks to a person.
 *
 * A session opens with a title, threads each step onto a single gutter, and
 * closes with either a summary or a cancellation. All command output is drawn
 * by one renderer so prompts, logs, and spinners share a visual language.
 */

import { Writable } from 'node:stream';
import {
  cancel as renderCancel,
  intro as renderIntro,
  note as renderNote,
  outro as renderOutro,
  spinner as createSpinner,
  type SpinnerResult,
} from '@clack/prompts';

/**
 * Matches SGR and other ANSI escape sequences.
 *
 * @remarks Built from a string so the two control characters it matches stay
 * written as escapes rather than being embedded literally in the source.
 */
const ANSI_PATTERN = new RegExp(
  '[\\u001B\\u009B][[\\]()#;?]*(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-nqry=><]',
  'g',
);

let sessionIsOpen = false;

/**
 * Remove ANSI escape sequences from a string.
 *
 * @param value string that may contain escape sequences.
 * @returns the string with every escape sequence removed.
 */
export function stripAnsi(value: string): string {
  return value.replace(ANSI_PATTERN, '');
}

/**
 * Wrap a stream so anything written to it is stripped of ANSI escapes first.
 *
 * @param target stream that should only ever receive plain text.
 * @returns a writable that forwards plain text to the target.
 */
function createPlainTextStream(target: NodeJS.WritableStream): Writable {
  return new Writable({
    write(chunk, _encoding, callback) {
      target.write(stripAnsi(String(chunk)));
      callback();
    },
  });
}

/**
 * Resolve the stream diagnostics should be written to.
 *
 * @remarks Color is chosen from stdout by the renderer, but warnings and errors
 * are written to stderr. When stderr is redirected to a file, escape sequences
 * are removed so the file holds plain text even while stdout stays a terminal.
 *
 * @param stream stderr stream to write to.
 * @returns stderr itself when it is a terminal, otherwise a plain-text wrapper.
 */
export function getDiagnosticOutput(
  stream: NodeJS.WriteStream = process.stderr,
): Writable {
  return stream.isTTY === true ? stream : createPlainTextStream(stream);
}

/**
 * Whether output is being drawn for a person at a terminal.
 *
 * @remarks Piped and redirected output is read by scripts and other commands,
 * so it gets plain lines instead of a drawn session frame.
 *
 * @param stream stdout stream to test.
 * @returns true when stdout is an interactive terminal.
 */
export function isInteractiveOutput(
  stream: NodeJS.WriteStream = process.stdout,
): boolean {
  return stream.isTTY === true;
}

/**
 * Whether a session frame is currently open.
 *
 * @returns true between `startSession` and `finishSession`/`cancelSession`.
 */
export function isSessionOpen(): boolean {
  return sessionIsOpen;
}

/**
 * Open a session frame.
 *
 * @param title short command label shown in the session header.
 */
export function startSession(title: string): void {
  if (sessionIsOpen) {
    return;
  }

  sessionIsOpen = true;

  if (isInteractiveOutput()) {
    renderIntro(title);
  }
}

/**
 * Close an open session frame with an optional summary.
 *
 * @param message summary shown on the closing line.
 */
export function finishSession(message?: string): void {
  if (!sessionIsOpen) {
    return;
  }

  sessionIsOpen = false;

  if (isInteractiveOutput()) {
    renderOutro(message);
    return;
  }

  if (message) {
    process.stdout.write(`${message}\n`);
  }
}

/**
 * Close an open session frame as cancelled or failed.
 *
 * @param message reason shown on the closing line.
 */
export function cancelSession(message: string): void {
  if (!sessionIsOpen) {
    return;
  }

  sessionIsOpen = false;

  if (isInteractiveOutput()) {
    renderCancel(message);
    return;
  }

  process.stderr.write(`${message}\n`);
}

/**
 * Render a bordered block of related lines inside the current session.
 *
 * @param message block body.
 * @param title optional block heading.
 */
export function note(message: string, title?: string): void {
  if (isInteractiveOutput()) {
    renderNote(message, title);
    return;
  }

  process.stdout.write(`${title ? `${title}\n` : ''}${message}\n`);
}

/**
 * Write one plain progress line.
 *
 * @param stream stream to write to.
 * @param message line to write, if any.
 */
function writeLine(stream: NodeJS.WriteStream, message?: string): void {
  if (message) {
    stream.write(`${message}\n`);
  }
}

/**
 * Create a spinner bound to the current session.
 *
 * @remarks Long-running work reports which phase it is in rather than
 * pretending to know how much of the total work is complete. Outside a
 * terminal there is nothing to animate, so each phase is written as one plain
 * line and the log stays readable in CI.
 *
 * @returns a spinner whose `message` updates the active phase.
 */
export function spinner(): SpinnerResult {
  if (isInteractiveOutput()) {
    return createSpinner({ indicator: 'timer' });
  }

  return {
    start: (message) => writeLine(process.stdout, message),
    stop: (message) => writeLine(process.stdout, message),
    message: (message) => writeLine(process.stdout, message),
    cancel: (message) => writeLine(process.stderr, message),
    error: (message) => writeLine(process.stderr, message),
    clear: () => undefined,
    isCancelled: false,
  };
}

/**
 * Reset session state.
 *
 * @remarks Exported for tests; production code opens and closes sessions in pairs.
 */
export function resetSessionForTesting(): void {
  sessionIsOpen = false;
}
