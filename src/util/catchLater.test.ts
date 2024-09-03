import catchLater from './catchLater';

describe('catchLater', () => {
  it('should return a promise that resolves successfully', async () => {
    const promise = Promise.resolve('success');
    const result = await catchLater(promise);
    expect(result).toBe('success');
  });

  it('should return a promise that rejects', async () => {
    const promise = Promise.reject(new Error('failure'));
    await expect(catchLater(promise)).rejects.toThrow('failure');
  });

  it('should call the catch method on the promise', async () => {
    const promise = Promise.reject(new Error('failure'));
    const catchSpy = jest.spyOn(promise, 'catch');
    catchLater(promise).catch(() => {}); // Ensure the promise is handled
    expect(catchSpy).toHaveBeenCalled();
  });
});
