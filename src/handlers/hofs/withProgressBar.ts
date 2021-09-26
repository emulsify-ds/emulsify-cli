import ProgressBar from 'progress';

export type HandlerWithProgress = (
  progress: InstanceType<typeof ProgressBar>
) => (...args: any[]) => Promise<void> | void;

/**
 * HOF that passes a progress bar into a given handler fn.
 * @param handler
 * @returns
 */
export default function withProgressBar(
  handler: HandlerWithProgress
): ReturnType<HandlerWithProgress> {
  const progress = new ProgressBar('[:bar] :percent :message', {
    total: 100,
    complete: '=',
    incomplete: ' ',
    width: 100,
  });

  return handler(progress);
}
