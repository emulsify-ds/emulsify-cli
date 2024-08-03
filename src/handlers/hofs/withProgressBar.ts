import ProgressBar from 'progress';

// In this case, we actually do not care what the args are, so any is fine.
export type HandlerWithProgress = (
  progress: InstanceType<typeof ProgressBar>,
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
) => (...args: any[]) => Promise<void> | void;

/**
 * HOF that passes a progress bar into a given handler fn.
 * @param handler fn that, when called, returns a fn that will be executed by commander.
 * @returns the function that handler returns.
 */
export default function withProgressBar(
  handler: HandlerWithProgress,
): ReturnType<HandlerWithProgress> {
  const progress = new ProgressBar('[:bar] :percent :message', {
    total: 100,
    complete: '=',
    incomplete: ' ',
    width: 100,
  });

  return handler(progress);
}
