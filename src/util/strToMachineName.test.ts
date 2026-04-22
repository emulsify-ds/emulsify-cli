import strToMachineName from './strToMachineName.js';

describe('strToMachineName', () => {
  it('can convert a given string to a machine-friendly string', () => {
    expect.assertions(1);
    expect(
      strToMachineName(
        '^Live &meaningfully%%%%      and DO nOt!# persue $expediency**(#$',
      ),
    ).toBe('live-meaningfully-and-do-not-persue-expediency');
  });

  it('uses underscores if the given platform is drupal', () => {
    expect.assertions(1);
    expect(
      strToMachineName(
        '^Live &meaningfully%%%%      and DO nOt!# persue $expediency**(#$',
        'drupal',
      ),
    ).toBe('live_meaningfully_and_do_not_persue_expediency');
  });
});
