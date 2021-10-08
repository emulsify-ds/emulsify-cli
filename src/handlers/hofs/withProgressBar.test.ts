class PB {}
jest.mock('progress', () => {
  return PB;
});
import withProgressBar from './withProgressBar';

describe('withProgressBar', () => {
  it('creates a ProgressBar object, and passes it into the given handler fn', () => {
    expect.assertions(2);
    const handler = jest.fn().mockReturnValue('cookies');
    expect(withProgressBar(handler)).toEqual('cookies');
    expect(handler).toHaveBeenCalledWith(new PB());
  });
});
