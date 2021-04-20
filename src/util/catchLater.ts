/**
 * Allows the promise passed as input to be asynchronously caught. If you
 * initialize a promise without a .catch() or without immediately awaiting it,
 * an UnhandledPromiseRejection warning will be issued. When you immediately
 * catch as we've done here, you prevent unhandled rejections while still allowing
 * a legitimate promise rejection to be caught asynchronously.
 *
 * Inspiration was drawn from the accepted answer on this stackoverflow
 * question:
 * https://stackoverflow.com/questions/40920179/should-i-refrain-from-handling-promise-rejection-asynchronously
 */
export default <R>(p: Promise<R>): Promise<R> => {
  p.catch(() => {});
  return p;
};
