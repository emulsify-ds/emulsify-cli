/**
 * Module that exports common types related to emulsify-cli interals.
 */
declare module '@emulsify-cli/internal' {
  import { Platform } from '@emulsify-cli/config';

  export type PlatformInstanceInfo = {
    /**
     * Name of the platform, such as "drupal".
     */
    name: Platform;
    /**
     * Absolute path to the root of the platform instance.
     *
     * @example /home/uname/Projects/cornflake
     */
    root: string;
    /**
     * String indicating the absolute path to the directory in which Emulsify should be located.
     *
     * @example /home/uname/Projects/cornflake/themes
     */
    emulsifyParentDirectory: string;
    /**
     * Major version of the platform.
     */
    platformMajorVersion?: number | void;
  };

  /**
   * Represents a base Emulsify project, such as a drupal theme.
   */
  export type EmulsifyBase = {
    platform: Platform;
    platformMajorVersion: number;
    /**
     * Path to git repository containing the base.
     */
    repository: string;
    /**
     * Git revision/branch/tag that should be checked out.
     */
    checkout?: string | void;
  };

  /**
   * Represents an internal reference to an Emulsify system, such as compound.
   */
  export type EmulsifySystemReference = {
    name: string;
    /**
     * Path to the git repository containing the system.
     */
    repository: string;
  };

  /**
   * Defines the aspects of composer.json files that are pertinent.
   */
  export type ComposerJson = {
    extra: {
      'installer-paths'?: {
        core?: string[];
      };
    };
  };
}
