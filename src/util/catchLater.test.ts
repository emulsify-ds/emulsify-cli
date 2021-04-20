import catchLater from './catchLater';

describe('catchLater', () => {
  it('can prevent unhandled promise rejections when caught asynchronously', async () => {
    const promise = catchLater(
      (async () => {
        throw new Error('pancakes');
      })()
    );

    await new Promise((res) => setTimeout(() => res(undefined), 0));

    try {
      await promise;
    } catch (e) {
      expect(e.message).toBe('pancakes');
    }
  });
});
