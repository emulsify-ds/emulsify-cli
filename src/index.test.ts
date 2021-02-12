import add from './index';

describe('index', () => {
  it('can add numbers', () => {
    expect(add(1, 2)).toBe(3);
  });
});
