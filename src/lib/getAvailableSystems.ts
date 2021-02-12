import type { EmulsifySystemReference } from '@emulsify-cli/config';

/**
 * Returns a list of available Emulsify Systems.
 *
 * Currently this function exports a single system, but eventually we will
 * integrate with a package registry, and do a lookup to find all available systems,
 * which is why this is an async function.
 *
 * @todo integrate with npm.
 */
/* eslint-disable-next-line @typescript-eslint/require-await */
export default async (): Promise<EmulsifySystemReference[]> => [
  {
    name: 'compound',
    repository: 'git@github.com:emulsify-ds/compound.git',
  },
];
