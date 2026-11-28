import { finishSession, startSession } from '../../lib/session.js';

export type SessionAction<Args extends unknown[]> = (
  ...args: Args
) => Promise<string | void> | string | void;

/**
 * HOF that frames a command handler as a session.
 *
 * The session opens before the handler runs and closes once it resolves, so
 * every line the handler logs is threaded onto one gutter. A handler may return
 * a string to set the closing summary.
 *
 * @remarks Failures are rethrown with the frame still open; the top-level
 * command runner closes it as cancelled so the failure reads as part of the
 * same session rather than as loose output after it.
 *
 * @param title short command label shown in the session header.
 * @param action handler that will be executed by commander.
 * @returns a commander action that runs the handler inside a session.
 */
export default function withSession<Args extends unknown[]>(
  title: string,
  action: SessionAction<Args>,
): (...args: Args) => Promise<void> {
  return async (...args: Args): Promise<void> => {
    startSession(title);

    const summary = await action(...args);

    finishSession(typeof summary === 'string' ? summary : undefined);
  };
}
