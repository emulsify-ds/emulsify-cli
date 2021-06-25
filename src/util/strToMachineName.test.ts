import strToMachineName from './strToMachineName';

describe('strToMachineName', () => {
  it('can convert a given string to a machine-friendly string', () => {
    expect.assertions(1);
    expect(
      strToMachineName(
        '^Live &meaningfully%%%%      and DO nOt!# persue $expediency**(#$'
      )
    ).toBe('live-meaningfully-and-do-not-persue-expediency');
  });
});
