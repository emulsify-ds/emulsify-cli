jest.mock('../../lib/session', () => ({
  startSession: jest.fn(),
  finishSession: jest.fn(),
}));

import { finishSession, startSession } from '../../lib/session.js';
import withSession from './withSession.js';

const startSessionMock = startSession as jest.Mock;
const finishSessionMock = finishSession as jest.Mock;

describe('withSession', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('frames the handler and passes every argument through', async () => {
    const action = jest.fn().mockResolvedValue(undefined);

    await withSession('emulsify init', action)('cornflake', './themes', {
      yes: true,
    });

    expect(startSessionMock).toHaveBeenCalledWith('emulsify init');
    expect(action).toHaveBeenCalledWith('cornflake', './themes', {
      yes: true,
    });
    expect(finishSessionMock).toHaveBeenCalledWith(undefined);
  });

  it('uses a returned string as the closing summary', async () => {
    const action = jest.fn().mockResolvedValue('cornflake is ready');

    await withSession('emulsify init', action)();

    expect(finishSessionMock).toHaveBeenCalledWith('cornflake is ready');
  });

  it('accepts a synchronous handler', async () => {
    await withSession('emulsify cache clear', () => 'cache cleared')();

    expect(finishSessionMock).toHaveBeenCalledWith('cache cleared');
  });

  it('opens the session before the handler runs', async () => {
    const action = jest.fn(() => {
      expect(startSessionMock).toHaveBeenCalledTimes(1);
      return undefined;
    });

    await withSession('emulsify system list', action)();

    expect(action).toHaveBeenCalledTimes(1);
  });

  it('leaves the frame open when the handler fails so the failure reads inside it', async () => {
    const failure = new Error('clone failed');
    const action = jest.fn().mockRejectedValue(failure);

    await expect(withSession('emulsify init', action)()).rejects.toBe(failure);

    expect(startSessionMock).toHaveBeenCalledTimes(1);
    expect(finishSessionMock).not.toHaveBeenCalled();
  });
});
