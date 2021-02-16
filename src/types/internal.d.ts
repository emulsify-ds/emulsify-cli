/**
 * Module that exports common types related to emulsify-cli interals.
 */
declare module '@emulsify-cli/internal' {
  export type SupportedPlatforms = 'drupal' | 'wordpress';

  export type Project = {
    platform: SupportedPlatforms;
    root: string;
    version: string;
  };

  export type ComposerJson = {
    extras: {
      'installer-paths'?: {
        core?: string[];
      };
    };
  };
}
