import CliError from './CliError.js';

describe('CliError', () => {
  it('stores a user-facing message and defaults the exit code to 1', () => {
    const error = new CliError('Expected failure');

    expect(error.message).toBe('Expected failure');
    expect(error.exitCode).toBe(1);
  });

  it('stores a custom exit code', () => {
    const error = new CliError('Expected success exit', 0);

    expect(error.exitCode).toBe(0);
  });
});
