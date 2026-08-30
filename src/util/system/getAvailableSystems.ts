import type { EmulsifySystemReference } from '@emulsify-cli/internal';

/**
 * Returns a list of available Emulsify Systems.
 *
 * Currently this function exports a single system, but eventually we will
 * integrate with a package registry, and do a lookup to find all available systems,
 * which is why this is an async function.
 *
 * @todo integrate with npm.
 */
export default async function getAvailableSystems(): Promise<
  EmulsifySystemReference[]
> {
  return [
    {
      name: 'compound',
      label: 'Compound',
      description: 'Accessible, tested components. Drupal, WordPress, plain.',
      repository: 'https://github.com/emulsify-ds/compound.git',
      platforms: ['none', 'drupal', 'wordpress'],
    },
    {
      name: 'emulsify-ui-kit',
      label: 'Emulsify UI Kit',
      description: 'Broader design-system starter kit.',
      repository: 'https://github.com/emulsify-ds/emulsify-ui-kit.git',
      platforms: ['none', 'drupal', 'wordpress'],
    },
  ];
}
