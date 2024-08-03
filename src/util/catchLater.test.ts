import catchLater from './catchLater.js';

describe('catchLater', () => {
  it('can prevent unhandled promise rejections when caught asynchronously', async () => {
    const promise = catchLater(
      /* eslint-disable-next-line @typescript-eslint/require-await */
      (async () => {
        throw new Error('pancakes');
      })(),
    );

    await new Promise((res) => setTimeout(() => res(undefined), 0));

    try {
      await promise;
    } catch (e) {
      expect(e).toEqual(Error('pancakes'));
    }
  });
});
